import { TaskDocument } from "./Task";
import { Template } from "@huggingface/jinja";
import OpenAI, { ClientOptions } from "openai";
import { extractJsonObject } from "../misc/json";
import { RunnerResult } from "./types";
import { isNone } from "../misc/isNone";
import { run_code_with } from "../misc/sandbox";
import { BaseRunner } from "./Runner";

// 从输入中分离出 <think></think> 内容
function parse_thinking(content: string) {
  const regex = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(regex);
  if (match) {
    const think = match[1].trim();
    const response = content.replace(regex, "").trim();
    return { think, response };
  }
  return { think: "", response: content };
}

export class TaskRunner<
  Inputs extends Record<string, any> = Record<string, any>
> extends BaseRunner {
  static client_options: ClientOptions = {};
  static default_model_name = "gpt-3.5-turbo";

  client: OpenAI;
  states = {} as Record<string, any>;

  model_name = TaskRunner.default_model_name;

  constructor(
    readonly config: {
      doc: TaskDocument;
      inputs: Inputs;
      options?: ClientOptions;
      httpAgent?: any;
    }
  ) {
    super();
    this.client = new OpenAI({
      ...TaskRunner.client_options,
      ...config.options,
      dangerouslyAllowBrowser: true,
      httpAgent: config.httpAgent,
    });
    this.init();
    this.run_init_code();
    this.validate();
  }

  private init() {
    const { doc, inputs } = this.config;
    this.states = { ...inputs };
    for (const def of doc.vars_init) {
      const { key } = def;
      const value = inputs[key] ?? def.default;
      this.states[key] = value;
    }
  }

  private run_init_code() {
    const { doc } = this.config;
    this.states = run_code_with(doc.init_code, this.states);
  }

  private validate() {
    const { doc } = this.config;
    const { states } = this;
    for (const def of doc.vars_init) {
      const { key } = def;
      const value = states[key];
      // check required
      if (def.required && isNone(value)) {
        throw new Error(
          `[${this.config.doc.document_id}]Missing required input: ${key}`
        );
      }
      // check type
      if (def.type) {
        if (def.type === "array") {
          if (!Array.isArray(value)) {
            throw new Error(
              `[${this.config.doc.document_id}]Input ${key} should be an array`
            );
          }
        }
      } else {
        if (typeof value !== def.type) {
          throw new Error(
            `[${this.config.doc.document_id}]Input ${key} should be a ${def.type}`
          );
        }
      }
    }
  }

  render_template() {
    const {
      states,
      config: { doc },
    } = this;
    const { template } = doc;
    const { history, metadata, json_schema } = doc;
    const system_prompt = this.render_system_prompt();
    const input_history = this.get_input_history();
    const all_history = [...history, ...input_history];
    try {
      return new Template(template).render({
        ...states,
        system_prompt,
        history: all_history,
      });
    } catch (error) {
      throw new Error(
        `[${this.config.doc.document_id}]Failed to render template: ${error}`
      );
    }
  }

  render_system_prompt() {
    const {
      states,
      config: { doc },
    } = this;
    const { system_prompt } = doc;
    try {
      return new Template(system_prompt).render(states);
    } catch (error) {
      throw new Error(
        `[${this.config.doc.document_id}]Failed to render system prompt: ${error}`
      );
    }
  }

  protected get_input_history() {
    const history_init = this.config.doc.vars_init.find(
      (x) => x.type === "history"
    );
    if (!history_init) return [];
    const { key } = history_init;
    return this.states[key] ?? [];
  }

  async execute_chat() {
    const { doc } = this.config;
    const { history, system_prompt, metadata, json_schema } = doc;
    const messages: any[] = [];
    const prompt = this.render_template();
    const input_history = this.get_input_history();

    if (system_prompt)
      messages.push({ role: "system", content: this.render_system_prompt() });
    if (history) messages.push(...history);
    messages.push(...input_history);
    messages.push({ role: "user", content: prompt });

    const is_deepseek_api = this.client.baseURL.includes("api.deepseek.com");

    const resp = await this.client.chat.completions.create(
      {
        model: this.model_name,
        messages,

        temperature: metadata.temperature,
        top_p: metadata.top_p,
        max_tokens: metadata.max_tokens,
        presence_penalty: metadata.presence_penalty,
        frequency_penalty: metadata.frequency_penalty,

        response_format: json_schema
          ? is_deepseek_api
            ? // deepseek 只支持 object
              // ref: https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
              { type: "json_object" }
            : {
                type: "json_schema",
                json_schema,
              }
          : undefined,
      },
      {
        signal: this.__signal,
      }
    );
    const content = resp.choices[0].message.content ?? "";
    return {
      ...extractJsonObject(content),
      content,
      ...parse_thinking(content),
    } as RunnerResult;
  }

  async execute_completion() {
    const { doc } = this.config;
    const { metadata, json_schema } = doc;
    // NOTE: 如果 completion 形式下，需要 system prompt 和 history 需要自行在模板中定义模式
    let prompt = this.render_template();

    if (json_schema) {
      console.warn(
        "Warning: JSON schema is not supported in completion mode yet."
      );
    }

    const resp = await this.client.completions.create(
      {
        model: this.model_name,
        prompt,

        temperature: metadata.temperature,
        top_p: metadata.top_p,
        max_tokens: metadata.max_tokens,
        presence_penalty: metadata.presence_penalty,
        frequency_penalty: metadata.frequency_penalty,
      },
      {
        signal: this.__signal,
      }
    );
    const content = resp.choices[0].text ?? "";
    return {
      ...extractJsonObject(content),
      content,
      ...parse_thinking(content),
    } as RunnerResult;
  }

  async execute() {
    const { doc } = this.config;
    const { metadata } = doc;
    if (metadata.request === "completion") {
      return this.execute_completion();
    } else {
      return this.execute_chat();
    }
  }
}
