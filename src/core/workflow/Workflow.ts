import { MarkdownRenderer } from "../../markdown/render";
import { Block } from "../../markdown/types";
import { deepClone } from "../../misc/deepClone";
import { DocumentBase, MarkdownDocument } from "../Document";
import { VarInit } from "../types";
import { IWorkflow, IWorkflowStep, IWorkflowNode } from "./types";

export class WorkflowDocument extends DocumentBase {
  intro: string = "";
  desc: string = "";

  vars_init: VarInit[] = [];
  workflow: IWorkflow = {
    nodes: [],
  };

  constructor(content: string) {
    super(content);

    this.read_document();
    this.read_metadata();
  }

  toJSON() {
    return deepClone({
      ...super.toJSON(),
      intro: this.intro,
      desc: this.desc,
      workflow: this.workflow,
      vars_init: this.vars_init,
    });
  }

  private read_metadata() {
    const { init } = this.metadata;
    if (init) this.vars_init = init;
  }

  private read_document() {
    const render = new MarkdownRenderer();
    const { blocks } = this.document;
    const get_section = (name: string) =>
      blocks.find(
        (x) =>
          x.title?.toLowerCase() === name.toLowerCase() && x.type === "section"
      );
    const render_block = (b?: Block | null) =>
      b ? render.render(b.children) : "";

    const intro = get_section("INTRO") || blocks[0];
    const desc = get_section("DESCRIPTION") || get_section("desc");

    this.intro = render_block(intro);
    this.desc = render_block(desc);

    const workflow = get_section("workflow");
    if (!workflow) {
      throw new Error("No workflow section found");
    }
    function read_list_item_data(input_block: Block) {
      // 这里输入的应该都是 list item
      const data: IWorkflowStep = {
        name: "",
        value: "",
        entries: [],
      };
      const { content = "", children } = input_block;
      const [name = "", value = ""] = content.split(":") || [];
      data.name = name.trim();
      data.value = value.trim();

      for (const child of children) {
        switch (child.type) {
          case "code": {
            // code 直接作为夫级的 value
            data.value = child.content;
            break;
          }
          case "listItem": {
            const sub_data = read_list_item_data(child);
            data.entries.push(sub_data);
            break;
          }
          case "list": {
            // const sub_lists = child.children.map(read_list_item_data);
            // for (const list_data of sub_lists) {
            //   data[list_data.name] = list_data.value;
            //   if (!list_data.value) {
            //     data[list_data.name] = list_data;
            //     delete data[list_data.name].value;
            //   }
            //   delete data[list_data.name].name;
            // }
            const list_data = read_list_item_data(child);
            data.entries.push(...list_data.entries);
            break;
          }
        }
      }
      return data;
    }
    function read_workflow_node(node_block: Block) {
      // 从 block 中读取 node 定义
      // 以 heading + list tree 的形式定义
      // 每个 tree 节点都是 [key,value] 对，同时有 children
      // 可能是这样:
      // ## GetInput
      // - form:
      //   - input:
      //     - desc: 你的下一步想法
      //     - type: string
      //   - choice:
      //     - desc: 选择建议
      //     - type: enum
      //     - enum: suggestions
      // - execute:
      //   ```js
      //   const { input, choice } = outputs;
      //   set("player_input", choice || input);
      //   ```
      // - goto: GenerateTurn

      const node: IWorkflowNode = {
        name: node_block.title!,
        steps: node_block.children[0].children.map(read_list_item_data),
      };

      return node;
    }
    this.workflow.nodes = workflow.children.map(read_workflow_node);
  }
}
