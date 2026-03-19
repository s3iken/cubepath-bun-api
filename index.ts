import { log } from "./src/lib/logger";
import { generateRequestId } from "./src/lib/request-id";
import { handleChatPost } from "./src/routes/chat";
import { handleUsers } from "./src/routes/users";
import { logProviderStatus } from "./src/services/provider";
import { initSchema } from "./src/db/init";

logProviderStatus();

initSchema().catch((err) => {
  console.warn("[db] No se pudo conectar a PostgreSQL:", err.message);
  console.warn("[db] Las rutas /users no estarán disponibles. Chat y health funcionan igual.");
});

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
    if (url.pathname.startsWith("/users")) {
      return handleUsers(req, url.pathname);
    }
    return new Response("Not Found", { status: 404 });
  },
});

log("http", `API escuchando en http://localhost:${server.port}`);