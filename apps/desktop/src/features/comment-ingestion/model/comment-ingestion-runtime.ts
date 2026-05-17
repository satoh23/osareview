import {
  CommentDeliveryWsClient,
  type CommentDeliveryWsClientOptions,
  type CommentIngestionRuntime,
} from "./comment-delivery-ws-client";

export type CommentIngestionRuntimeOptions = CommentDeliveryWsClientOptions;

export function createCommentIngestionRuntime(
  options: CommentIngestionRuntimeOptions = {},
): CommentIngestionRuntime {
  return new CommentDeliveryWsClient(options);
}
