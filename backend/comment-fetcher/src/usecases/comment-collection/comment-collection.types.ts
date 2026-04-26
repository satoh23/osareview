import type { Comment } from "../../entities/comment/comment.js";
import type { FetchCommentsInput } from "./comment-repository.interface.js";

export type CollectCommentsInput = FetchCommentsInput;
export type CollectCommentsStream = AsyncIterable<Comment[]>;
