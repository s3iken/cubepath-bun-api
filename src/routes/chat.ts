import { log, g } from "../lib/logger";
import { generateRequestId } from "../lib/request-id";
import { getNextProvider } from "../services/provider";
import type { ChatRequestBody } from "../types/chat";

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

export async function handleChatPost(req: Request, requestId?: string): Promise<Response> {
  const id = requestId ?? generateRequestId();

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  log("chat", "Entrando en handleChatRoute", id);
  log("chat", `Method=${req.method} URL=${new URL(req.url).href}`, id);

  let body: ChatRequestBody;
  try {
    log("chat", "Parseando JSON del body", id);
    const text = await req.text();
    body = parseBody(text || "{}");
    log("chat", "Body parseado correctamente", id);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  const fields = Object.keys(body).filter((k) => (body as Record<string, unknown>)[k] != null);
  log("chat", `Campos recibidos: [ ${fields.map((f) => g(`"${f}"`)).join(", ")} ]`, id);

  let messages: { role: "user"; content: string }[];
  try {
    log("chat", "Normalizando mensajes", id);
    messages = getMessages(body);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const provider = getNextProvider();
    const model = body.model ?? provider.defaultModel;

    log("chat", `Proveedor seleccionado: ${g(provider.name)}`, id);
    log("chat", `Modelo solicitado: ${g(model)}`, id);
    log("chat", `Número de mensajes: ${messages.length}`, id);

    const firstMsg = messages[0];
    if (firstMsg) {
      const contentPreview =
        firstMsg.content.length > 50 ? `${firstMsg.content.slice(0, 50)}...` : firstMsg.content;
      log("chat", "Preview primer mensaje:", id);
      console.log(`  { role: ${g('"user"')}, contentPreview: ${g(`"${contentPreview}"`)} }`);
    }

    log("chat", `Solicitando stream al proveedor ${g(provider.name)}...`, id);

    const stream = provider.stream(messages, model);

    return new Response(
      (async function* () {
        for await (const content of stream) {
          yield content;
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
      err instanceof Error ? err.message : "Chat request failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
