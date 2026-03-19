import { env } from "../config/env";

const API_URL = "https://api.cerebras.ai/v1/chat/completions";
const DEFAULT_MODEL = "llama3.1-8b";

async function* streamSSE(
  res: Response,
): AsyncGenerator<string, void, unknown> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip invalid JSON
        }
      }
    }
  }
}

export async function* streamChat(
  messages: { role: "user"; content: string }[],
): AsyncGenerator<string, void, unknown> {
  const apiKey = env.cerebrasApiKey;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY not configured");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cerebras API error: ${res.status} ${err}`);
  }

  yield* streamSSE(res);
}
