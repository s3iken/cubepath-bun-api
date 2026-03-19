import { OpenRouter } from "@openrouter/sdk";
import { env } from "../config/env";

let _client: OpenRouter | null = null;

export function getOpenRouter(): OpenRouter {
  if (!_client) {
    const key = env.openRouterApiKey;
    if (!key) throw new Error("OPENROUTER_API_KEY not configured");
    _client = new OpenRouter({ apiKey: key });
  }
  return _client;
}

export const openrouter = {
  get chat() {
    return getOpenRouter().chat;
  },
};
