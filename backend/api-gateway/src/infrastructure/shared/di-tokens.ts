export const API_GATEWAY_DI_TOKENS = {
  sessionStateOutputPort: Symbol("apiGateway.sessionStateOutputPort"),
  youtubePipelineRunner: Symbol("apiGateway.youtubePipelineRunner"),
  twitchPipelineRunner: Symbol("apiGateway.twitchPipelineRunner"),
  failedSessionResetDelayMs: Symbol("apiGateway.failedSessionResetDelayMs"),
} as const;
