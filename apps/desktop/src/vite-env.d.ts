/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_HTTP_URL?: string;
  readonly VITE_API_GATEWAY_WS_URL?: string;
  readonly VITE_COMMENT_STREAM_BUFFER_SIZE?: string;
}
