// --- Define the structure for our output Block Tree ---
export interface Block {
  type:
    | "root"
    | "section"
    | "paragraph"
    | "code"
    | "blockquote"
    | "list"
    | "listItem"
    | "thematicBreak"
    | "other";
  depth?: number; // For section (heading depth)
  title?: string; // For section (heading text)
  // No 'content' directly on 'section' anymore
  content?: string; // Text for paragraph, code, first para of list item
  language?: string | null; // For code blocks
  meta?: string | null; // For code blocks
  ordered?: boolean; // For lists
  children: Block[]; // Nested blocks
}
