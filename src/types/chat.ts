export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestBody {
  message?: string;
  messages?: ChatMessage[];
  model?: string;
}
