import "reflect-metadata";

export {
  runCommentFetcherApp,
  type RunCommentFetcherAppOptions,
} from "./app/main.js";
export { registerCommentFetcherDependencies } from "./register-di-dependencies.js";
export type { CommentOutputPort } from "./usecases/comment-collection/comment-collection.interface.js";
export type { Comment, MonetaryAmount, User } from "./entities/index.js";
