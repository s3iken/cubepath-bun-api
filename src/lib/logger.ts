import pc from "picocolors";

export type LogContext =
  | "http"
  | "chat"
  | "openrouter"
  | "cerebras"
  | "groq";

function formatPrefix(context: LogContext, requestId?: string): string {
  const id = requestId ? `[${requestId}]` : "";
  return `${pc.dim(`[${context}]`)}${id}`;
}

export function log(
  context: LogContext,
  message: string,
  requestId?: string,
): void {
  console.log(`${formatPrefix(context, requestId)} ${message}`);
}

export function logValue(context: LogContext, message: string, value: string, requestId?: string): void {
  console.log(`${formatPrefix(context, requestId)} ${message} ${pc.green(value)}`);
}

export function logObject(
  context: LogContext,
  message: string,
  obj: Record<string, unknown>,
  requestId?: string,
): void {
  const lines = JSON.stringify(obj, null, 2)
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*"[^"]+"\s*:\s*)(.+)$/);
      if (match) {
        return `${match[1]}${pc.green(match[2])}`;
      }
      return line;
    });
  console.log(`${formatPrefix(context, requestId)} ${message}`);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
}

export function g(value: string): string {
  return pc.green(value);
}
