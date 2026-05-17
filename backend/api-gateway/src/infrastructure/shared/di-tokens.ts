export const API_GATEWAY_DI_TOKENS = {
  authClient: Symbol("apiGateway.authClient"),
  sessionStateOutputPort: Symbol("apiGateway.sessionStateOutputPort"),
  accountStateOutputPort: Symbol("apiGateway.accountStateOutputPort"),
  youtubePipelineRunner: Symbol("apiGateway.youtubePipelineRunner"),
  twitchPipelineRunner: Symbol("apiGateway.twitchPipelineRunner"),
  failedSessionResetDelayMs: Symbol("apiGateway.failedSessionResetDelayMs"),
} as const;
