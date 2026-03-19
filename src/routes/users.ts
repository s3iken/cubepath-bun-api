import { requireDb } from "../db";
import type { CreateUserInput, UpdateUserInput } from "../models/user";

const USERS_PATH = "/users";
type Db = NonNullable<ReturnType<typeof requireDb>>;

function parseId(pathname: string): number | null {
  const match = pathname.match(new RegExp(`^${USERS_PATH}/(\\d+)$`));
  return match ? parseInt(match[1], 10) : null;
}

export async function handleUsers(req: Request, pathname: string): Promise<Response> {
  let sql;
  try {
    sql = requireDb();
  } catch {
    return Response.json(
      { error: "Base de datos no disponible. Configura DATABASE_URL." },
      { status: 503 },
    );
  }

  const method = req.method;
  const id = parseId(pathname);

  if (pathname === USERS_PATH) {
    if (method === "GET") return listUsers(sql);
    if (method === "POST") return createUser(sql, req);
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (id !== null) {
    if (method === "GET") return getUser(sql, id);
    if (method === "PUT" || method === "PATCH") return updateUser(sql, id, req);
    if (method === "DELETE") return deleteUser(sql, id);
    return new Response("Method Not Allowed", { status: 405 });
  }

  return new Response("Not Found", { status: 404 });
}

async function listUsers(db: Db): Promise<Response> {
  const users = await db`SELECT id, name, email, created_at FROM users ORDER BY id`;
  return Response.json(users);
}

async function getUser(db: Db, id: number): Promise<Response> {
  const [user] = await db`
    SELECT id, name, email, created_at FROM users WHERE id = ${id}
  `;
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return Response.json(user);
}

async function createUser(db: Db, req: Request): Promise<Response> {
  let body: CreateUserInput;
  try {
    body = (await req.json()) as CreateUserInput;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email } = body;
  if (!name || typeof name !== "string" || !email || typeof email !== "string") {
    return Response.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  try {
    const [user] = await db`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING id, name, email, created_at
    `;
    return Response.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    if (message.includes("unique") || message.includes("duplicate")) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

async function updateUser(db: Db, id: number, req: Request): Promise<Response> {
  let body: UpdateUserInput;
  try {
    body = (await req.json()) as UpdateUserInput;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email } = body;
  if (!name && !email) {
    return Response.json(
      { error: "At least one of name or email is required" },
      { status: 400 },
    );
  }

  const [existing] = await db`SELECT id FROM users WHERE id = ${id}`;
  if (!existing) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    const [user] = await db`
      UPDATE users SET ${db(updates)} WHERE id = ${id}
      RETURNING id, name, email, created_at
    `;
    return Response.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    if (message.includes("unique") || message.includes("duplicate")) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

async function deleteUser(db: Db, id: number): Promise<Response> {
  const [user] = await db`
    DELETE FROM users WHERE id = ${id}
    RETURNING id
  `;
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
