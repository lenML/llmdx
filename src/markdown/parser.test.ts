import { MarkdownParser } from "./parser";
import { Block } from "./types";

describe("MarkdownParser", () => {
  it("should parse a markdown", () => {
    const markdownText = `
---
title: DSL Example
tags: [test, dsl]
---

# Config

First paragraph of config description.
Second paragraph, still part of Config. Should merge with first.

? This is a third paragraph, should merge too.

\`\`\`javascript
// Some JS code
console.log("Code block breaks paragraph merge");
\`\`\`

This paragraph starts a new text block after the code.

> Blockquote also breaks merge.
> Second line in blockquote (merged into blockquote's paragraph child).

Another paragraph after the blockquote.

## Sub Config 1

Paragraph for sub-config.

\`\`\`md user
console.log("markdown user")
\`\`\`

Another paragraph for Sub Config 1 (new text block).

Yet another paragraph, merged with the previous one.

## Sub Config 2

\`\`\`javascript script
console.log("hello world script")
\`\`\`

Paragraph for Sub Config 2.

# Data

- Item 1 text.
  Paragraph continues for item 1. (Should merge into Item 1's paragraph child).
- Item 2 first line.
  \`\`\`js
  // Code inside item 2
  \`\`\`
  Text after code in item 2 (new paragraph child).
- Item 3 first line.
  > Quote inside item 3.
  Text after quote in item 3 (new paragraph child).
- Item 4 first line.
  - Nested list item A.
    More text for A.
  - Nested list item B.
- Item 5 (only one paragraph).

Final top-level paragraph (should be a child paragraph of Data section).
Another final paragraph (merged with previous).
    `.trim();
    // prettier-ignore
    const expectBlocks = [{"type":"section","depth":1,"title":"Config","children":[{"type":"paragraph","content":"First paragraph of config description.\nSecond paragraph, still part of Config. Should merge with first.\n\n? This is a third paragraph, should merge too.","children":[]},{"type":"code","language":"javascript","meta":null,"content":"// Some JS code\nconsole.log(\"Code block breaks paragraph merge\");","children":[]},{"type":"paragraph","content":"This paragraph starts a new text block after the code.","children":[]},{"type":"blockquote","children":[{"type":"paragraph","content":"Blockquote also breaks merge.\nSecond line in blockquote (merged into blockquote's paragraph child).","children":[]}]},{"type":"paragraph","content":"Another paragraph after the blockquote.","children":[]},{"type":"section","depth":2,"title":"Sub Config 1","children":[{"type":"paragraph","content":"Paragraph for sub-config.","children":[]},{"type":"code","language":"md","meta":"user","content":"console.log(\"markdown user\")","children":[]},{"type":"paragraph","content":"Another paragraph for Sub Config 1 (new text block).\n\nYet another paragraph, merged with the previous one.","children":[]}]},{"type":"section","depth":2,"title":"Sub Config 2","children":[{"type":"code","language":"javascript","meta":"script","content":"console.log(\"hello world script\")","children":[]},{"type":"paragraph","content":"Paragraph for Sub Config 2.","children":[]}]}]},{"type":"section","depth":1,"title":"Data","children":[{"type":"list","ordered":false,"children":[{"type":"listItem","content":"Item 1 text.\nParagraph continues for item 1. (Should merge into Item 1's paragraph child).","children":[]},{"type":"listItem","content":"Item 2 first line.","children":[{"type":"code","language":"js","meta":null,"content":"// Code inside item 2","children":[]},{"type":"paragraph","content":"Text after code in item 2 (new paragraph child).","children":[]}]},{"type":"listItem","content":"Item 3 first line.","children":[{"type":"blockquote","children":[{"type":"paragraph","content":"Quote inside item 3.\nText after quote in item 3 (new paragraph child).","children":[]}]}]},{"type":"listItem","content":"Item 4 first line.","children":[{"type":"list","ordered":false,"children":[{"type":"listItem","content":"Nested list item A.\nMore text for A.","children":[]},{"type":"listItem","content":"Nested list item B.","children":[]}]}]},{"type":"listItem","content":"Item 5 (only one paragraph).","children":[]}]},{"type":"paragraph","content":"Final top-level paragraph (should be a child paragraph of Data section).\nAnother final paragraph (merged with previous).","children":[]}]}];
    const expectResult = {
      metadata: {
        title: "DSL Example",
        tags: ["test", "dsl"],
      },
      blocks: expectBlocks,
    };

    const parser = new MarkdownParser();
    const result = parser.parse(markdownText);
    expect(result).toEqual(expectResult);
  });
});
