import { log } from "./src/lib/logger";
import { generateRequestId } from "./src/lib/request-id";
import { handleChatPost } from "./src/routes/chat";
import { logProviderStatus } from "./src/services/provider";

logProviderStatus();

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const requestId = generateRequestId();

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("public/index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }
    if (url.pathname === "/chat") {
      log("http", `-> POST ${url.pathname}`, requestId);
      return handleChatPost(req, requestId);
    }
    return new Response("Not Found", { status: 404 });
  },
});

log("http", `API escuchando en http://localhost:${server.port}`);