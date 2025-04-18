import OpenAI, { ClientOptions } from "openai";

export interface OpenAICompatibleConfig {
  client_options?: ClientOptions;
  model_name?: string;
  completions_options?: Pick<
    OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    | "temperature"
    | "top_p"
    | "max_tokens"
    | "max_completion_tokens"
    | "frequency_penalty"
    | "presence_penalty"
    | "seed"
    | "stop"
    | "n"
    | "response_format"
  >;
}
