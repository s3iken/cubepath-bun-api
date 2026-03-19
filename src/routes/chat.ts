import { openrouter } from "../services/openrouter";
import type { ChatRequestBody } from "../types/chat";

const DEFAULT_MODEL = "openrouter/free";

function parseBody(body: string): ChatRequestBody {
  try {
    return JSON.parse(body) as ChatRequestBody;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function getMessages(
  body: ChatRequestBody,
): { role: "user"; content: string }[] {
  if (body.messages?.length) {
    return body.messages
      .filter((m) => m.role === "user" && m.content)
      .map((m) => ({ role: "user" as const, content: m.content }));
  }
  if (body.message && typeof body.message === "string") {
    return [{ role: "user" as const, content: body.message }];
  }
  throw new Error("Request must include 'message' or 'messages'");
}

export async function handleChatPost(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: ChatRequestBody;
  try {
    const text = await req.text();
    body = parseBody(text || "{}");
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  let messages: { role: "user"; content: string }[];
  try {
    messages = getMessages(body);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  const model = body.model ?? DEFAULT_MODEL;

  try {
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model,
        messages,
        stream: true,
      },
    });

    return new Response(
      (async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      })(),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Transfer-Encoding": "chunked",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OpenRouter request failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
