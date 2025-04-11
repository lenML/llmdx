import { TaskDocument } from "./Task";
import { Template } from "@huggingface/jinja";
import OpenAI, { ClientOptions } from "openai";
import { extractJsonObject } from "../misc/json";

interface RunnerResult {
  content: string;
  [key: string]: any;
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
      task: TaskDocument;
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
    const { task, inputs } = this.config;
    for (const def of task.vars_init) {
      const { key } = def;
      this.states[key] = inputs[key] ?? def.default;
    }
  }

  render_template() {
    const {
      states,
      config: { task },
    } = this;
    const { template } = task;
    return new Template(template).render(states);
  }

  async execute_chat() {
    const { task } = this.config;
    const { history, system_prompt, metadata } = task;
    const messages: any[] = [];
    const prompt = this.render_template();

    if (system_prompt)
      messages.push({ role: "system", content: system_prompt });
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
    });
    const content = resp.choices[0].message.content ?? "";
    return {
      ...extractJsonObject(content),
      content,
    } as RunnerResult;
  }

  async execute_completion() {
    const { task } = this.config;
    const { metadata } = task;
    const prompt = this.render_template();

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
    } as RunnerResult;
  }

  async execute() {
    const { task } = this.config;
    const { metadata } = task;
    if (metadata.request === "completion") {
      return this.execute_completion();
    } else {
      return this.execute_chat();
    }
  }
}
