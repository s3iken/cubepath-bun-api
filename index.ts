const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`API running at http://localhost:${server.port}`);