import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import matter from "gray-matter";
import type {
  Root,
  Content,
  Heading,
  Paragraph,
  Code,
  Blockquote,
  List,
  ListItem,
  Text,
  InlineCode,
} from "mdast";
import { Block } from "./types";

// --- Helper function to extract text content from phrasing nodes ---
function extractNodeText(node: Content | ListItem): string {
  let text = "";
  visit(
    node,
    ["text", "inlineCode"] as string[],
    (child: Text | InlineCode) => {
      if (child.value && typeof child.value === "string") {
        text += child.value;
      }
    }
  );
  return text.trim();
}

// --- The Transformer Class ---
export class BlockTransformer {
  private ast: Root;
  private stack: Block[] = [];
  private rootBlocks: Block[] = [];

  constructor(ast: Root) {
    visit(ast, (node) => {
      if ("position" in node) {
        delete node.position;
      }
    });
    this.ast = ast;
  }

  transform(): Block[] {
    this.stack = [];
    this.rootBlocks = [];
    this.ast.children.forEach((node) => {
      this.processNode(node);
    });
    return this.rootBlocks;
  }

  private getCurrentParent(): Block | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Adds a block as a child to the current parent, or to the root.
   * IMPORTANT: This does NOT handle paragraph merging logic.
   */
  private addBlock(block: Block): void {
    const parent = this.getCurrentParent();
    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(block);
    } else {
      this.rootBlocks.push(block);
    }
  }

  /**
   * Processes a node, deciding whether to merge or add a new block.
   */
  private processNode(node: Content): void {
    switch (node.type) {
      case "heading":
        this.handleHeading(node);
        break;
      case "paragraph":
        // Paragraph handling now decides whether to merge or create new
        this.handleParagraph(node);
        break;
      case "code":
        this.handleCode(node);
        break;
      case "blockquote":
        this.handleBlockquote(node);
        break;
      case "list":
        this.handleList(node);
        break;
      case "thematicBreak":
        // Thematic breaks act like distinct blocks, interrupting paragraph merging
        this.addBlock({ type: "thematicBreak", children: [] });
        break;
      default:
        // console.log("Ignoring node type:", node.type);
        break;
    }
  }

  // --- Node Type Handlers ---

  private handleHeading(node: Heading): void {
    const title = extractNodeText(node);
    const newSection: Block = {
      type: "section",
      depth: node.depth,
      title: title,
      // No 'content' field here
      children: [],
    };
    while (
      this.stack.length > 0 &&
      this.getCurrentParent()!.depth! >= newSection.depth!
    ) {
      this.stack.pop();
    }
    this.addBlock(newSection); // Add section itself
    this.stack.push(newSection); // Push section onto stack to become parent
  }

  /**
   * Handles Paragraphs: Merges with previous paragraph child if possible,
   * otherwise creates a new paragraph block.
   * This applies universally (under sections, list items, blockquotes).
   */
  private handleParagraph(node: Paragraph): void {
    const text = extractNodeText(node);
    if (!text) return; // Ignore empty paragraphs

    const parent = this.getCurrentParent();

    // Check if we should merge with the last child of the parent
    let merged = false;
    if (parent && parent.children && parent.children.length > 0) {
      const lastChild = parent.children[parent.children.length - 1];
      // Merge only if the last child is a paragraph type
      if (lastChild.type === "paragraph") {
        // Append to the existing paragraph block's content
        lastChild.content =
          (lastChild.content ? lastChild.content + "\n\n" : "") + text;
        merged = true;
      }
    }

    // If not merged (no parent, no children, or last child wasn't a paragraph), create a new block
    if (!merged) {
      const paragraphBlock: Block = {
        type: "paragraph",
        content: text,
        children: [], // Paragraph blocks don't have children in this model
      };
      this.addBlock(paragraphBlock); // Add the new paragraph block to the parent
    }
  }

  // Handles Code blocks - simply adds them as children
  private handleCode(node: Code): void {
    const codeBlock: Block = {
      type: "code",
      language: node.lang,
      meta: node.meta,
      content: node.value,
      children: [],
    };
    this.addBlock(codeBlock); // Code blocks interrupt paragraph merging
  }

  // Handles Blockquotes - creates a blockquote container and processes children
  private handleBlockquote(node: Blockquote): void {
    const quoteBlock: Block = {
      type: "blockquote",
      children: [],
    };
    this.addBlock(quoteBlock); // Blockquotes interrupt paragraph merging
    this.stack.push(quoteBlock); // Push blockquote as parent for its content
    node.children.forEach((child) => this.processNode(child)); // Process children recursively
    this.stack.pop();
  }

  // Handles Lists - creates list/listitem blocks, processes children recursively
  private handleList(node: List): void {
    const listBlock: Block = {
      type: "list",
      ordered: node.ordered ?? false,
      children: [], // List items will go here
    };
    this.addBlock(listBlock); // Lists interrupt paragraph merging

    // Process list items
    node.children.forEach((listItemNode) => {
      const listItemBlock: Block = {
        type: "listItem",
        // We still use 'content' for the *first* paragraph's text in a list item for structure.
        // Subsequent paragraphs or blocks become children.
        content: "",
        children: [],
      };
      listBlock.children.push(listItemBlock); // Add item to the list

      let isFirstParagraph = true; // For special handling of list item's initial text

      this.stack.push(listItemBlock); // Push item as parent for its content

      listItemNode.children.forEach((itemContentNode) => {
        if (isFirstParagraph && itemContentNode.type === "paragraph") {
          const text = extractNodeText(itemContentNode);
          // Put the *first* paragraph's text directly into listItem content
          listItemBlock.content =
            (listItemBlock.content ? listItemBlock.content + "\n" : "") + text;
          if (text) {
            isFirstParagraph = false; // Mark first paragraph handled
          }
          // *Don't* call processNode for this first paragraph
        } else {
          isFirstParagraph = false; // Past the first paragraph now
          // Process subsequent paragraphs, lists, blockquotes etc. normally.
          // handleParagraph will merge consecutive paragraphs *within* the list item's children.
          this.processNode(itemContentNode);
        }
      });
      this.stack.pop(); // Pop list item
    });
  }
}

export class MarkdownParser {
  parse(markdownText: string): {
    metadata: Record<string, any>;
    blocks: Block[];
  } {
    const { content, data: metadata } = matter(markdownText);
    const ast = unified().use(remarkParse).parse(content);
    const transformer = new BlockTransformer(ast as Root);
    return {
      metadata,
      blocks: transformer.transform(),
    };
  }
}
