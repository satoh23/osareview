import { registerCommentFetcherDependencies } from "@comment-dock/comment-fetcher";
import { registerCommentDeliveryDependencies } from "@comment-dock/comment-delivery";

export const registerApiGatewayDependencies = (): void => {
  // Fetcher / delivery はライブラリとして同一コンテナに登録し、
  // Gateway 側の usecase / server は後続タスクでここに追加していく。
  registerCommentFetcherDependencies();
  registerCommentDeliveryDependencies();
};
