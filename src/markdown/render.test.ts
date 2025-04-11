import { MarkdownRenderer } from "./render";
import { Block } from "./types";

describe("MarkdownRenderer", () => {
  it("should render block to markdown", () => {
    const exampleBlocks: Block[] = [
      { type: "section", depth: 1, title: "Main Title", children: [] },
      {
        type: "paragraph",
        content: "This is the first paragraph.",
        children: [],
      },
      {
        type: "section",
        depth: 2,
        title: "Subsection",
        children: [
          {
            type: "paragraph",
            content: "Content within the subsection.",
            children: [],
          },
          {
            type: "list",
            ordered: false,
            children: [
              { type: "listItem", content: "First item", children: [] },
              {
                type: "listItem",
                content: "Second item with code",
                children: [
                  {
                    type: "code",
                    language: "javascript",
                    meta: null,
                    content: "console.log('hello');\nconst x = 1;",
                    children: [],
                  },
                  {
                    type: "paragraph",
                    content: "Another paragraph in the list item.",
                    children: [],
                  },
                ],
              },
              { type: "listItem", content: "Third item", children: [] },
            ],
          },
        ],
      },
      { type: "thematicBreak", children: [] },
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            content: "This is line one of the quote.",
            children: [],
          },
          { type: "paragraph", content: "This is line two.", children: [] },
        ],
      },
      {
        type: "list",
        ordered: true,
        children: [
          { type: "listItem", content: "Ordered 1", children: [] },
          {
            type: "listItem",
            content: "Ordered 2",
            children: [
              {
                type: "list", // Nested list
                ordered: false,
                children: [
                  { type: "listItem", content: "Nested A", children: [] },
                  { type: "listItem", content: "Nested B", children: [] },
                ],
              },
            ],
          },
          { type: "listItem", content: "Ordered 3", children: [] },
        ],
      },
    ];
    const expectResult = `
# Main Title

This is the first paragraph.

## Subsection

Content within the subsection.

* First item
* Second item with code
        \`\`\`javascript
        console.log('hello');
        const x = 1;
        \`\`\`

        Another paragraph in the list item.
* Third item

---

> This is line one of the quote.
> 
> This is line two.

1. Ordered 1
2. Ordered 2
        * Nested A
        * Nested B
3. Ordered 3
`.trim();

    const renderer = new MarkdownRenderer();
    const result = renderer.render(exampleBlocks);
    expect(result).toEqual(expectResult);
  });
});
