import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";
import { DELIVERY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";
import type { CommentDecorator } from "./usecases/interfaces/comment-decorator.interface.js";
import { IdentityDecorator } from "./adapters/decorators/identity.decorator.js";

export const registerCommentDeliveryDependencies = (
  targetContainer: DependencyContainer = container,
): void => {
  targetContainer.register<CommentDecorator>(
    DELIVERY_DI_TOKENS.commentDecorator,
    {
      useClass: IdentityDecorator,
    },
  );
};
