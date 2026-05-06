import { container, type DependencyContainer } from "tsyringe";
import { DELIVERY_DI_TOKENS } from "../infrastructure/shared/di-tokens.js";
import type { CommentOutputPort } from "../usecases/interfaces/comment-output-port.interface.js";
import { DeliverCommentsUseCase } from "../usecases/deliver-comments.usecase.js";

export const runCommentDeliveryApp = async (
  targetContainer: DependencyContainer = container,
): Promise<void> => {
  const deliverCommentsUseCase = targetContainer.resolve(
    DeliverCommentsUseCase,
  );
  const outputPort = targetContainer.resolve<CommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputPort,
  );

  try {
    await deliverCommentsUseCase.deliverToUi();
  } finally {
    await outputPort.close?.();
  }
};
