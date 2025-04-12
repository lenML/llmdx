import { TaskDocument } from "./Task";
import { Template } from "@huggingface/jinja";
import OpenAI, { ClientOptions } from "openai";
import { extractJsonObject } from "../misc/json";
import { RunnerResult } from "./types";

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
> {
  static client_options: ClientOptions = {};

  client: OpenAI;
  states = {} as Record<string, any>;

  model_name = "gpt-3.5-turbo";

  constructor(
    readonly config: {
      doc: TaskDocument;
      inputs: Inputs;
      options?: ClientOptions;
    }
  ) {
    this.client = new OpenAI({
      ...TaskRunner.client_options,
      ...config.options,
    });
    this.init();
  }

  private init() {
    const { doc, inputs } = this.config;
    this.states = { ...inputs };
    for (const def of doc.vars_init) {
      const { key } = def;
      this.states[key] = inputs[key] ?? def.default;
      // TODO: 缺少类型校验和特别类型检查比如 array enums
    }
  }

  render_template() {
    const {
      states,
      config: { doc },
    } = this;
    const { template } = doc;
    try {
      return new Template(template).render(states);
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

  async execute_chat() {
    const { doc } = this.config;
    const { history, system_prompt, metadata, json_schema } = doc;
    const messages: any[] = [];
    const prompt = this.render_template();

    if (system_prompt)
      messages.push({ role: "system", content: this.render_system_prompt() });
    if (history) messages.push(...history);
    messages.push({ role: "user", content: prompt });

    const resp = await this.client.chat.completions.create({
      model: this.model_name,
      messages,

      temperature: metadata.temperature,
      top_p: metadata.top_p,
      max_tokens: metadata.max_tokens,
      presence_penalty: metadata.presence_penalty,
      frequency_penalty: metadata.frequency_penalty,

      response_format: json_schema
        ? {
            type: "json_schema",
            json_schema,
          }
        : undefined,
    });
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
    const system_prompt = this.render_system_prompt();
    let prompt = this.render_template();
    if (system_prompt) {
      // TODO: 这里的拼接模板应该提供可配置的入口
      prompt = `${system_prompt}\n---\n${prompt}`;
    }

    if (json_schema) {
      console.warn(
        "Warning: JSON schema is not supported in completion mode yet."
      );
    }

    const resp = await this.client.completions.create({
      model: this.model_name,
      prompt,

      temperature: metadata.temperature,
      top_p: metadata.top_p,
      max_tokens: metadata.max_tokens,
      presence_penalty: metadata.presence_penalty,
      frequency_penalty: metadata.frequency_penalty,
    });
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
