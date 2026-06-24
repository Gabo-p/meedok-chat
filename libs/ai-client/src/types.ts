export interface ModelConfig {
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
}

export interface AiClientConfig {
  region: string;
  defaultModelId: string;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Minimal Pino-compatible logger interface accepted by AiClient */
export interface Logger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
}
