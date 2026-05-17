const DEFAULT_COMMENT_STREAM_BUFFER_SIZE = 500;

const configuredBufferSize = Number(
  import.meta.env.VITE_COMMENT_STREAM_BUFFER_SIZE,
);

export const COMMENT_STREAM_BUFFER_SIZE =
  Number.isFinite(configuredBufferSize) && configuredBufferSize > 0
    ? configuredBufferSize
    : DEFAULT_COMMENT_STREAM_BUFFER_SIZE;
