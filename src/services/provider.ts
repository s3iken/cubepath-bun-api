import { log } from "../lib/logger";
import { openrouter } from "./openrouter";
import * as cerebras from "./cerebras";
import * as groq from "./groq";
import { env } from "../config/env";

export type ChatProvider = "openrouter" | "cerebras" | "groq";

type StreamFn = (
  messages: { role: "user"; content: string }[],
  model?: string,
) => AsyncGenerator<string, void, unknown>;

interface ProviderConfig {
  name: ChatProvider;
  stream: StreamFn;
  defaultModel: string;
}

function buildProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (env.openRouterApiKey) {
    providers.push({
      name: "openrouter",
      defaultModel: "openrouter/free",
      stream: async function* (messages, model) {
        const stream = await openrouter.chat.send({
          chatGenerationParams: {
            model: model ?? "openrouter/free",
            messages,
            stream: true,
          },
        });
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) yield content;
        }
      },
    });
  }

  if (env.cerebrasApiKey) {
    providers.push({
      name: "cerebras",
      defaultModel: "llama3.1-8b",
      stream: async function* (messages) {
        yield* cerebras.streamChat(messages);
      },
    });
  }

  if (env.groqApiKey) {
    providers.push({
      name: "groq",
      defaultModel: "openai/gpt-oss-20b",
      stream: async function* (messages) {
        yield* groq.streamChat(messages);
      },
    });
  }

  return providers;
}

const providers = buildProviders();
let roundRobinIndex = 0;

function maskApiKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function logProviderStatus(): void {
  if (env.openRouterApiKey) {
    log("openrouter", "Proveedor inicializado");
    log("openrouter", `API key detectada (${maskApiKey(env.openRouterApiKey)})`);
  }
  if (env.cerebrasApiKey) {
    log("cerebras", "Proveedor inicializado");
    log("cerebras", `API key detectada (${maskApiKey(env.cerebrasApiKey)})`);
  }
  if (env.groqApiKey) {
    log("groq", "Proveedor inicializado");
    log("groq", `API key detectada (${maskApiKey(env.groqApiKey)})`);
  }
}

export function getNextProvider(): ProviderConfig {
  if (providers.length === 0) {
    throw new Error(
      "No chat providers configured. Set at least one of: OPENROUTER_API_KEY, CEREBRAS_API_KEY, GROQ_API_KEY",
    );
  }
  const provider = providers[roundRobinIndex % providers.length];
  roundRobinIndex += 1;
  return provider;
}
