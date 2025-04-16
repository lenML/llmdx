import { Template } from "@huggingface/jinja";
import { MarkdownRenderer } from "../../markdown/render";
import { DocumentBase } from "../Document";
import { marked } from "marked";
import { run_code_with } from "../../misc/sandbox";

export class InspectorDocument extends DocumentBase {
  // preload code 会在每次渲染的时候在最前面执行
  preload_code = "";
  template = "";
  templates = {} as Record<string, string>;

  constructor(content: string) {
    super(content);

    this.read_document();
  }

  private read_document() {
    const render = new MarkdownRenderer();
    const { blocks } = this.document;
    const preload_code = blocks.find((x) => x.title === "--preload--");
    if (preload_code) {
      this.preload_code =
        preload_code.children.find((x) => x.type === "code")?.content ?? "";
    }
    const sub_templates = blocks.filter((x) =>
      x.title?.startsWith("template:")
    );
    for (const sub_template of sub_templates) {
      const name = sub_template.title?.replace("template:", "") ?? "";
      const content = render.render(sub_template.children);
      this.templates[name] = content;
    }

    const show_blocks = blocks.filter(
      (x) => [preload_code, ...sub_templates].indexOf(x) < 0
    );
    this.template = render.render(show_blocks);
  }

  protected render_templates(context: Record<string, any>) {
    const templates = {} as Record<string, any>;
    for (const [name, content] of Object.entries(this.templates)) {
      templates[name] = new Template(content).render(context);
    }
    return templates;
  }

  render(inputs: Record<string, any>) {
    const context = run_code_with(this.preload_code, {}) as Record<string, any>;
    const compiled_markdown = new Template(this.template).render({
      ...context,
      ...inputs,
      ...this.render_templates({
        ...context,
        ...inputs,
      }),
    });
    const compiled_html = marked.parse(compiled_markdown);
    return compiled_html;
  }
}
