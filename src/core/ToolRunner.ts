import { ClientOptions } from "openai";
import { TaskDocument } from "./Task";
import { TaskRunner } from "./TaskRunner";
import { ToolDocument } from "./Tool";
import { BaseRunner } from "./Runner";

function apply_code(
  code: string,
  context: Record<string, any>,
  extra: Record<string, any> = {}
) {
  const keys = Object.keys(context);
  const values = Object.values(context);
  const extra_keys = Object.keys(extra);
  const extra_values = Object.values(extra);
  const warper_code = `${code};\nreturn {${keys.join(", ")}};`;
  const func = new Function(...keys, ...extra_keys, warper_code);
  return func(...values, ...extra_values);
}

/**
 * tool runner
 */
export class ToolRunner extends BaseRunner {
  protected payload_task: TaskDocument;
  states: Record<string, any> = {};

  constructor(
    readonly config: {
      doc: ToolDocument;
      inputs: Record<string, any>;
      fetch?: typeof globalThis.fetch;
      fetch_init?: RequestInit;
    }
  ) {
    super();
    this.payload_task = config.doc.build_payload_task();
    this.init();
  }

  private apply_init_code(inputs: Record<string, any>) {
    const { init_code } = this.config.doc;
    if (!init_code) return inputs;
    return apply_code(init_code, inputs, this.build_context());
  }

  private init() {
    const { doc, inputs } = this.config;
    this.states = { ...inputs };
    for (const def of doc.vars_init) {
      const { key } = def;
      this.states[key] = inputs[key] ?? def.default;
      // TODO: 缺少类型校验和特别类型检查比如 array enums
    }

    this.states = this.apply_init_code(this.states);
  }

  request_payload({
    inputs,
    options,
  }: {
    inputs: Record<string, any>;
    options?: ClientOptions;
  }) {
    const runner = new TaskRunner({
      doc: this.payload_task,
      inputs,
      options,
    });
    return runner.execute();
  }

  private normalize_str(text: string) {
    if (!text.startsWith("get.")) {
      return text;
    }
    const key = text.substring("get.".length);
    const value = this.states[key] ?? process.env[key];
    if (!value) {
      throw new Error(`get.${key} not found`);
    }
    return value;
  }

  async request_tool({
    payload,
    fetch = this.config.fetch ?? globalThis.fetch,
  }: {
    payload: Record<string, any>;
    fetch: typeof globalThis.fetch;
  }) {
    // remove `content`
    delete payload.content;

    const { metadata } = this.config.doc;
    const { tool_type, base_url, url_path } = metadata;
    switch (tool_type.toLowerCase()) {
      case "http-get": {
        const url = `${this.normalize_str(base_url)}${url_path}`;
        const query = new URLSearchParams(payload).toString();
        const full_url = `${url}?${query}`;
        const resp = await fetch(full_url, {
          ...this.config.fetch_init,
          method: "GET",
        });
        const output = await resp.json();
        return output;
      }
      case "http-post": {
        const url = `${base_url}${url_path}`;
        const resp = await fetch(url, {
          ...this.config.fetch_init,
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            ...this.config.fetch_init?.headers,
            "Content-Type": "application/json",
          },
          signal: this.__signal,
        });
        const output = await resp.json();
        return output;
      }
      case "js": {
        throw new Error("not implemented");
        break;
      }
      case "python": {
        throw new Error("not implemented");
        break;
      }
      default: {
        throw new Error(`unknown tool type: ${tool_type}`);
      }
    }
  }

  private build_context() {
    return {
      env: typeof process !== "undefined" ? process.env : {},
      document: this.config.doc,
    };
  }

  private apply_output_code(output: Record<string, any>) {
    const { output_code } = this.config.doc;
    if (!output_code) return { output };
    return apply_code(output_code, { output }, this.build_context());
  }

  async request({
    fetch = this.config.fetch ?? globalThis.fetch,
  }: {
    fetch?: typeof globalThis.fetch;
  } = {}) {
    const payload = await this.request_payload({
      inputs: this.states,
    });
    const output = await this.request_tool({
      payload,
      fetch,
    });
    return this.apply_output_code(output) as Record<string, any>;
  }
}
