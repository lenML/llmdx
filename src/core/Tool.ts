import { MarkdownRenderer } from "../markdown/render";
import { Block } from "../markdown/types";
import { DocumentBase } from "./Document";
import { TaskDocument } from "./Task";
import { VarInit } from "./types";

/**
 * Tool document 类
 *
 * 这个文档定义以下内容:
 * 1. 何时调用
 * 2. 如何调用
 * 3. 如何初始化
 * 4. 如何解析结果
 * 5. 上下文模板
 */
export class ToolDocument extends DocumentBase {
  intro: string = "";
  desc: string = "";
  system_prompt: string = "";
  template: string = "";
  json_schema: any = null;
  vars_init: VarInit[] = [];

  init_code = "";
  output_code = "";

  constructor(content: string) {
    super(content);
    this.read_document();
    this.read_metadata();
  }

  private read_metadata() {
    const { init } = this.metadata;
    if (init) this.vars_init = init;
  }

  /**
   * 创建 payload 任务
   */
  build_payload_task() {
    const task = new TaskDocument("");
    task.document_id = `${this.document_id}-generate-payload`;
    task.metadata = { ...this.metadata, type: "task" };
    task.intro = `a task to generate payload for tool ${this.document_id}`;
    task.desc = this.desc;
    task.system_prompt = this.system_prompt;
    task.template = this.template;
    task.json_schema = this.json_schema;
    task.vars_init = this.vars_init;
    return task;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      intro: this.intro,
      desc: this.desc,
      system_prompt: this.system_prompt,
      template: this.template,
      json_schema: this.json_schema,
      vars_init: this.vars_init,
      init_code: this.init_code,
      output_code: this.output_code,
    };
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
    const template = get_section("TEMPLATE");
    const json_schema = get_section("JSON SCHEMA");

    this.intro = render_block(intro);
    this.desc = render_block(desc);
    this.system_prompt = render_block(system_prompt);
    this.template = render_block(template);

    json_schema?.children.forEach((block) => {
      if (block.type !== "code") return;
      const { language, content } = block;
      if (language !== "json") return;
      if (!content) return;
      this.json_schema = JSON.parse(content);
    });

    // init 是 js 代码
    const init = get_section("INIT")?.children.find((x) => x.type === "code");
    if (init) this.init_code = init.content || "";
    // output 也是 js 代码
    const output = get_section("OUTPUT")?.children.find(
      (x) => x.type === "code"
    );
    if (output) this.output_code = output.content || "";
  }
}
