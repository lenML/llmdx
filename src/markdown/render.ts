import { Block } from "./types";

// --- Rendering Context ---
interface RenderContext {
  indentLevel: number;
  list?: {
    ordered: boolean;
    currentNumber: number; // This is the number the *current* item should use
  };
}

// --- Markdown Renderer Class ---
export class MarkdownRenderer {
  private readonly indentSize: number = 4; // Spaces per indent level

  public render(blocks: Block[]): string {
    return this.renderBlocksInternal(blocks, { indentLevel: 0 });
  }

  private renderBlocksInternal(
    blocks: Block[],
    context: RenderContext
  ): string {
    let markdownOutput: string[] = [];
    // Track the list number for the *next* sibling item at this level
    let nextListNumber = context.list?.currentNumber ?? 1;

    blocks.forEach((block) => {
      let blockMarkdown = "";
      // Create context for rendering the *current* block.
      // Pass the correct current number for *this* item if it's a list item.
      const blockContext: RenderContext = {
        ...context,
        list: context.list
          ? { ...context.list, currentNumber: nextListNumber }
          : undefined, // <-- FIX: Pass the tracked number here
      };

      blockMarkdown = this.renderSingleBlock(block, blockContext);

      // Increment the list number *after* rendering the current item,
      // so the *next* sibling gets the correct number.
      if (block.type === "listItem" && context.list?.ordered) {
        nextListNumber++;
      }

      if (blockMarkdown) {
        markdownOutput.push(blockMarkdown);
      }
    });

    return this.joinRenderedBlocks(markdownOutput, blocks, context);
  }

  private renderSingleBlock(block: Block, context: RenderContext): string {
    switch (block.type) {
      case "root":
        return this.renderRoot(block, context);
      case "section":
        return this.renderSection(block, context);
      case "paragraph":
        return this.renderParagraph(block, context);
      case "code":
        return this.renderCode(block, context);
      case "blockquote":
        return this.renderBlockquote(block, context);
      case "list":
        return this.renderList(block, context);
      case "listItem":
        // renderListItem will use context.list.currentNumber passed in blockContext
        return this.renderListItem(block, context);
      case "thematicBreak":
        return this.renderThematicBreak(block, context);
      case "other":
      default:
        console.warn(
          `MarkdownRenderer: Skipping unhandled block type "${block.type}"`
        );
        return "";
    }
  }

  private getIndent(level: number): string {
    return " ".repeat(level * this.indentSize);
  }

  private renderRoot(block: Block, context: RenderContext): string {
    // Reset context for root's children? Usually not needed if called from render()
    // But safer might be: return this.renderBlocksInternal(block.children, { indentLevel: 0 });
    // Let's stick to inheriting context for now, as root might be nested (though unlikely)
    return this.renderBlocksInternal(block.children, context);
  }

  private renderSection(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    const depth = Math.max(1, block.depth || 1);
    let markdown = `${baseIndent}${"#".repeat(depth)} ${block.title || ""}`;

    // Render children without increased indent level relative to the heading marker
    // Important: Reset list context for children of a section.
    const childrenContext: RenderContext = { indentLevel: context.indentLevel };
    const childrenMarkdown = this.renderBlocksInternal(
      block.children,
      childrenContext
    );

    if (childrenMarkdown) {
      markdown += `\n\n${childrenMarkdown}`;
    }
    return markdown;
  }

  private renderParagraph(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    return `${baseIndent}${block.content || ""}`;
  }

  private renderCode(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    const lang = block.language || "";
    const infoString = `${lang}${block.meta ? ` ${block.meta}` : ""}`.trim();
    // Indent content relative to the block's base indent level
    const codeContent = (block.content || "")
      .split("\n")
      .map((line) => `${baseIndent}${line}`)
      .join("\n");
    return `${baseIndent}\`\`\`${infoString}\n${codeContent}\n${baseIndent}\`\`\``;
  }

  private renderBlockquote(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    // Render children relative to the quote start (indent 0 inside), inheriting list context doesn't make sense here.
    const childrenContext: RenderContext = { indentLevel: 0 };
    const quoteContent = this.renderBlocksInternal(
      block.children,
      childrenContext
    ).trimEnd();

    return quoteContent
      .split("\n")
      .map((line) => `${baseIndent}> ${line}`)
      .join("\n");
  }

  private renderList(block: Block, context: RenderContext): string {
    // Prepare context for direct children (listItems)
    const listContextForChildren: RenderContext = {
      indentLevel: context.indentLevel, // listItems are at the same indent level as the list conceptually
      list: {
        ordered: !!block.ordered,
        currentNumber: 1, // Start numbering at 1 for this list
      },
    };
    // Render the children (listItems) using this new context
    return this.renderBlocksInternal(block.children, listContextForChildren);
  }

  private renderListItem(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    let prefix: string;

    // Use the list context passed down specifically for this item
    if (!context.list) {
      console.warn(
        "MarkdownRenderer: listItem rendered outside of a list context. Treating as unordered."
      );
      prefix = "*";
    } else {
      prefix = context.list.ordered
        ? `${context.list.currentNumber}.` // Use the number from the context
        : "*";
    }

    let markdown = `${baseIndent}${prefix} ${block.content || ""}`;

    // Render children with increased indentation level.
    // Children are NOT part of the parent list's numbering sequence directly.
    // Reset list context for children unless a child is a list itself.
    const childrenContext: RenderContext = {
      indentLevel: context.indentLevel + 1,
    };
    const childrenMarkdown = this.renderBlocksInternal(
      block.children,
      childrenContext
    );

    if (childrenMarkdown) {
      const childIndent = this.getIndent(context.indentLevel + 1); // Children indent is one level deeper
      const indentedChildren = childrenMarkdown
        .split("\n")
        // Indent non-empty lines of the children's rendered output
        .map((line) => (line.trim() ? `${childIndent}${line}` : ""))
        .join("\n");
      markdown += `\n${indentedChildren}`; // Add a newline before indented children
    }

    return markdown;
  }

  private renderThematicBreak(block: Block, context: RenderContext): string {
    const baseIndent = this.getIndent(context.indentLevel);
    return `${baseIndent}---`;
  }

  private joinRenderedBlocks(
    renderedBlocks: string[],
    originalBlocks: Block[],
    context: RenderContext
  ): string {
    let result = "";
    for (let i = 0; i < renderedBlocks.length; i++) {
      result += renderedBlocks[i];

      if (i < renderedBlocks.length - 1) {
        const currentBlockType = originalBlocks[i]?.type;
        const nextBlockType = originalBlocks[i + 1]?.type;

        // Add only one newline between consecutive list items *if they are siblings managed by the same list context*
        if (
          currentBlockType === "listItem" &&
          nextBlockType === "listItem" &&
          context.list
        ) {
          result += "\n";
        } else {
          // Otherwise, add two newlines for separation
          result += "\n\n";
        }
      }
    }
    // Ensure trailing newline if content exists? Usually handled by block separation.
    // if (result && !result.endsWith('\n\n') && !result.endsWith('```\n')) result += '\n'; // Maybe too aggressive
    return result;
  }
}
