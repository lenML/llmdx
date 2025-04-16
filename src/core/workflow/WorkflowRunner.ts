import { deepClone } from "../../misc/deepClone";
import { run_code_with, run_getter_code } from "../../misc/sandbox";
import { BaseRunner } from "../Runner";
import { TaskDocument } from "../Task";
import { TaskRunner } from "../TaskRunner";
import { InspectorDocument } from "../inspector";
import { DocumentRegistry } from "./DocumentRegistry";
import { WorkflowDocument } from "./Workflow";
import { IWorkflow, IWorkflowStep, IWorkflowNode } from "./types";
import { EventEmitter } from "eventemitter3";

interface FormDefine {
  title: string;
  fieldset: {
    name: string;
    value: string;
    desc?: string;
    type?: string;
    enum?: any;
    init?: string;
  }[];
}

type NodeStackItem = {
  node: IWorkflowNode;
  step_index: number;
};

interface WorkflowSnapshot {
  node_stack: NodeStackItem[];
  is_done: boolean;
  context: Record<string, any>;
  states: Record<string, any>;
}

export class WorkflowRunner extends BaseRunner {
  node_stack: NodeStackItem[] = [];
  is_done: boolean = false;

  context = {} as Record<string, any>;
  states = {} as Record<string, any>;

  events = new EventEmitter<{
    step_start: [IWorkflowStep, IWorkflowNode];
    step_done: [IWorkflowStep, IWorkflowNode];
    step_error: [IWorkflowStep, IWorkflowNode, Error];
    step_progress: [any, IWorkflowStep, IWorkflowNode];

    start: [];
    done: [];
    aborted: [];
    error: [Error];
  }>();

  constructor(
    readonly config: {
      doc: WorkflowDocument;
      registry: DocumentRegistry;
      inspector?: InspectorDocument;
      request_input?: () => Promise<string> | string;
      request_form?: (
        form_def: FormDefine
      ) => Promise<Record<string, any>> | Record<string, any>;
      inputs?: Record<string, any>;
    }
  ) {
    super();
    this.check_dependencies();
    this.init();
  }

  top_node() {
    return this.node_stack[this.node_stack.length - 1];
  }

  current_node() {
    return this.top_node()?.node;
  }

  current_step() {
    return this.top_node()?.node.steps[this.top_node().step_index];
  }

  snapshot() {
    return deepClone({
      node_stack: this.node_stack,
      is_done: this.is_done,
      context: this.context,
      states: this.states,
    }) as WorkflowSnapshot;
  }

  restore(snapshot: WorkflowSnapshot) {
    snapshot = deepClone(snapshot);
    this.node_stack = snapshot.node_stack;
    this.is_done = snapshot.is_done;
    this.context = snapshot.context;
    this.states = snapshot.states;
  }

  inspect() {
    if (!this.config.inspector) throw new Error("Missing inspector");
    return this.config.inspector.render({
      ...this.context,
      ...this.states,
    });
  }

  private init() {
    this.init_node_stack();
    this.init_states();
    this.__connect(() => (this.is_done = true));
    this.__connect(() => this.events.removeAllListeners());
  }

  private init_states() {
    const { doc, inputs } = this.config;
    this.states = { ...inputs };
    for (const def of doc.vars_init) {
      const { key } = def;
      this.states[key] = inputs?.[key] ?? def.default;
      // TODO: 缺少类型校验和特别类型检查比如 array enums
    }
  }

  private init_node_stack() {
    const {
      workflow,
      metadata: { start_node },
    } = this.config.doc;
    const nodes = workflow.nodes;
    const current_node = nodes.find((x) => x.name === start_node);
    if (!current_node) {
      throw new Error(`Start node ${start_node} not found`);
    }
    this.node_stack.push({
      node: current_node,
      step_index: 0,
    });
  }

  run_code(code: string, extra: any = {}) {
    return run_getter_code(code, {
      ...this.context,
      ...this.states,
      ...extra,
    });
  }

  private check_dependencies() {
    const { workflow } = this.config.doc;
    const task_ids = workflow.nodes
      .flatMap((x) =>
        x.steps.flatMap((x) => (x.name === "task" ? x.value : null))
      )
      .filter(Boolean);

    for (const id of task_ids) {
      if (!this.config.registry.get(id)) {
        throw new Error(
          `Required task ${id} not found, please add it to the registry`
        );
      }
    }
  }

  get_task(id: string) {
    const content = this.config.registry.get(id);
    if (!content) {
      throw new Error(`Task ${id} not found`);
    }
    return new TaskDocument(content);
  }

  async execute_task(id: string, inputs: Record<string, any>) {
    const task = this.get_task(id);
    const runner = new TaskRunner({
      doc: task,
      inputs,
    });
    this.__connect(runner);
    return runner.execute();
  }

  private consume_ifelse_steps() {
    // 将当前的 if else 消费掉并解析为 if else feed
    let current_step: IWorkflowStep | null = this.current_step();
    if (!current_step || current_step.name !== "if") {
      throw new Error("Current step is not if");
    }
    const ifelse_steps: IWorkflowStep[] = [];
    while (current_step) {
      ifelse_steps.push(current_step);
      this.top_node().step_index += 1;
      current_step = this.current_step();
      if (current_step.name !== "else" && current_step.name !== "elseif") {
        break;
      }
    }

    return ifelse_steps;
  }

  async next() {
    const current_step = this.current_step();
    if (!current_step) {
      // empty step
      if (this.node_stack.length === 0) {
        // NOTE: 这里需不需要报错，不太清楚
      }
      // pop stack
      this.node_stack.pop();
      return;
    }
    const { name, value, entries } = current_step;
    switch (name.toLowerCase()) {
      // TODO: tool 调用，应该和task类似
      case "task": {
        const inputs = Object.fromEntries(
          entries
            .find((x) => x.name === "inputs")
            ?.entries.map((x) => [x.name, this.run_code(x.value)]) || []
        );
        // TODO: build watcher
        const watcher = null;
        const outputs = await this.execute_task(value, inputs);
        this.context = { outputs };
        break;
      }
      case "execute": {
        const states_keys = Object.keys(this.states);
        const context_keys = Object.keys(this.context);
        const next_data = run_code_with(value, {
          ...this.context,
          ...this.states,
        });
        for (const k of states_keys) {
          this.states[k] = next_data[k];
        }
        for (const k of context_keys) {
          this.context[k] = next_data[k];
        }
        break;
      }
      case "call":
      case "goto": {
        const node = this.config.doc.workflow.nodes.find(
          (x) => x.name === value
        );
        if (!node) {
          throw new Error(`Node ${value} not found`);
        }

        if (name.toLowerCase() === "goto") this.node_stack.pop();
        this.node_stack.push({
          node,
          step_index: 0,
        });
        return;
      }
      case "wait_input": {
        if (!this.config.request_input) {
          throw new Error("Missing request_input callback");
        }
        const user_input = await this.config.request_input();
        this.context = { user_input };
        this.states.user_input = user_input;
        break;
      }
      case "if": {
        const ifelse_steps = this.consume_ifelse_steps();
        for (const step of ifelse_steps) {
          const { name, value, entries } = step;
          const condition = name === "else" ? true : this.run_code(value);
          if (condition) {
            this.node_stack.push({
              node: {
                name: "ifelse-node",
                steps: entries,
              },
              step_index: 0,
            });
            return;
          }
        }
        break;
      }
      case "else": {
        // 报错，因为不应该走这里，都会在 if step 的时候消耗掉
        // 到达这里表示语法错误
        throw new Error("Syntax error, else should not be here");
      }
      case "elseif": {
        throw new Error("Syntax error, elseif should not be here");
      }
      case "break": {
        this.node_stack.pop();
        return;
      }
      case "exit": {
        this.is_done = true;
        return;
      }
      case "form": {
        if (!this.config.request_form) {
          throw new Error("Missing request_form callback");
        }
        // 请求一个表单值
        const fieldset = entries.map((field) => ({
          name: field.name,
          value: field.value,
          ...Object.fromEntries(field.entries.map((x) => [x.name, x.value])),
        })) as FormDefine["fieldset"];
        for (const field of fieldset) {
          if (field.type === "enum" && field.enum) {
            try {
              field.enum = this.run_code(field.enum);
            } catch (error) {
              throw new Error(`Invalid enum field: ${field}, error: ${error}`);
            }
          }
          if (field.init) {
            try {
              field.value = this.run_code(field.init);
            } catch (error) {
              throw new Error(`Invalid init field: ${field}, error: ${error}`);
            }
          }
        }
        const outputs = await this.config.request_form({
          title: value,
          fieldset: fieldset,
        });
        this.context = { outputs };
        break;
      }
      default: {
        throw new Error(`Not implemented step: ${name}`);
      }
    }
    this.top_node().step_index += 1;
  }

  async execute() {
    this.events.emit("start");
    while (!this.is_done) {
      const node = this.current_node();
      const step = this.current_step();
      this.events.emit("step_start", step, node);
      try {
        await this.next();
        this.events.emit("step_done", step, node);
      } catch (error) {
        this.events.emit("step_error", step, node, error as Error);
        this.__do_abort();
        this.events.emit("error", error as Error);
        throw error;
      }
    }
    this.events.emit("done");
  }

  async exit() {
    this.__do_abort();
    this.events.emit("aborted");
  }
}
