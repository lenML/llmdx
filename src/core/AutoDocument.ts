import matter from "gray-matter";
import { ToolDocument } from "./Tool";
import { TaskDocument } from "./Task";
import { WorkflowDocument } from "./workflow/Workflow";

export class AutoDocument {
  static from(content: string) {
    const {
      data: { type },
    } = matter(content);
    switch (type.toLowerCase()) {
      case "tool":
        return new ToolDocument(content);
      case "task":
        return new TaskDocument(content);
      case "workflow":
        return new WorkflowDocument(content);
      default:
        throw new Error(`Unknown document type: ${type}`);
    }
  }
}
