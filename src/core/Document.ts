import { MarkdownParser } from "../markdown/parser";
import { Block } from "../markdown/types";

import pkgJson from "../../package.json";
import { v4 as uuidv4 } from "uuid";
import { deepClone } from "../misc/deepClone";

export class MarkdownDocument {
  static from(content: string) {
    const parser = new MarkdownParser();
    const { metadata, blocks } = parser.parse(content);
    const doc = new MarkdownDocument(metadata, blocks);
    return doc;
  }

  metadata: Record<string, any> = {};
  blocks: Block[] = [];

  constructor(metadata: Record<string, any> = {}, blocks: Block[] = []) {
    this.metadata = metadata;
    this.blocks = blocks;
  }
}

export class DocumentBase {
  static VERSION = pkgJson.version;

  document: MarkdownDocument;
  type: string = "";
  document_id: string = "";
  metadata: Record<string, any> = {};
  id = uuidv4();

  constructor(content: string) {
    this.document = MarkdownDocument.from(content);

    this.check_metadata();
  }

  protected check_metadata() {
    const { engine, type, id } = this.document.metadata;
    if (engine && !DocumentBase.VERSION.startsWith(engine)) {
      console.warn(
        `Document engine version ${engine} is not compatible with current environment ${DocumentBase.VERSION}`
      );
    }

    this.type = type || "";
    this.metadata = this.document.metadata;
    this.document_id = id;
  }

  toJSON(): any {
    return deepClone({
      type: this.type,
      document_id: this.document_id,
      id: this.id,
      metadata: this.metadata,
      // blocks: this.document.blocks,
    });
  }
}
