import { MarkdownRenderer } from "../markdown/render";
import { Block } from "../markdown/types";
import { deepClone } from "../misc/deepClone";
import { DocumentBase, MarkdownDocument } from "./Document";
import { ChatMessage, VarInit } from "./types";

function parse_query_string(query: string) {
  if (query.startsWith("?")) query = query.slice(1);
  const params = new URLSearchParams(query);
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of params) {
    if (key in result) {
      const existing = result[key];
      result[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class TaskDocument extends DocumentBase {
  intro: string = "";
  desc: string = "";
  system_prompt: string = "";
  history: ChatMessage[] = [];
  template: string = "";
  json_schema: any = null;

  vars_init: VarInit[] = [];

  constructor(content: string) {
    super(content);
    this.read_document();
    this.read_metadata();
  }

  private read_metadata() {
    const { init } = this.metadata;
    if (init) this.vars_init = init;
  }

  toJSON() {
    return deepClone({
      ...super.toJSON(),
      intro: this.intro,
      desc: this.desc,
      system_prompt: this.system_prompt,
      history: this.history,
      template: this.template,
      json_schema: this.json_schema,
      vars_init: this.vars_init,
    });
  }

  /**
   * 从原始 document 中读取 task 定义的数据
   */
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
    const system_prompt = get_section("SYSTEM PROMPT");
    const history = get_section("HISTORY");
    const template = get_section("TEMPLATE");
    const json_schema = get_section("JSON SCHEMA");

    this.intro = render_block(intro);
    this.desc = render_block(desc);
    this.system_prompt = render_block(system_prompt);
    this.template = render_block(template);

    const history_messages: any[] = [];
    for (const message of history?.children || []) {
      if (message.type !== "code") continue;
      const { content, meta = "" } = message;
      const { role } = parse_query_string(meta || "");
      if (typeof role !== "string") continue;
      if (role.toLowerCase() === "system") {
        this.system_prompt = content || "";
        // TODO: 这里如果重复写入应该报错
        continue;
      }

      history_messages.push({
        role: role,
        content,
      });
    }
    this.history = history_messages;

    json_schema?.children.forEach((block) => {
      if (block.type !== "code") return;
      const { language, content } = block;
      if (language !== "json") return;
      if (!content) return;
      this.json_schema = JSON.parse(content);
    });
  }
}
