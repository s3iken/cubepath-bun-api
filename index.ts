import { handleChatPost } from "./src/routes/chat";

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("public/index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }
    if (url.pathname === "/chat") {
      return handleChatPost(req);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`API running at http://localhost:${server.port}`);