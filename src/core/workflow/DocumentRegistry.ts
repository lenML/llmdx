import matter from "gray-matter";
import { v4 as uuid } from "uuid";

/**
 * 文档的注册中心
 *
 * 在此处请求和发起依赖
 *
 * 故意不接受 document 实例，就是把文档原本的内容当作不可变数据来存储
 */
export class DocumentRegistry {
  static get_document_id(content: string) {
    const {
      data: { id },
    } = matter(content);
    return id;
  }

  readonly id = uuid();
  documents: Map<string, string> = new Map();

  constructor(init_documents: string[] = []) {
    for (const doc of init_documents) {
      if (typeof doc !== "string")
        throw new Error("input document must be string");
      this.register(doc);
    }
  }

  register(doc: string) {
    if (typeof doc !== "string")
      throw new Error("input document must be string");
    const id = DocumentRegistry.get_document_id(doc);
    if (!id) {
      throw new Error("document id not found");
    }
    if (this.documents.has(id)) {
      throw new Error(`document ${id} already exists`);
    }
    this.documents.set(id, doc);
  }

  get(id: string) {
    return this.documents.get(id);
  }

  size() {
    return this.documents.size;
  }

  values() {
    return this.documents.values();
  }

  entries() {
    return this.documents.entries();
  }

  keys() {
    return this.documents.keys();
  }
}
