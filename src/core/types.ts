export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type VarInit = {
  key: string;
  type: string;
  default?: any;
  required?: boolean;
  title?: string;
  description?: string;
  enums?: any[];
};
