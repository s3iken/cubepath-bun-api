function getEnvVarOptional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  openRouterApiKey: getEnvVarOptional("OPENROUTER_API_KEY"),
  cerebrasApiKey: getEnvVarOptional("CEREBRAS_API_KEY"),
  groqApiKey: getEnvVarOptional("GROQ_API_KEY"),
};
