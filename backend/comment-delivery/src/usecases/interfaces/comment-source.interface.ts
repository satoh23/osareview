export interface CommentSource<TComment = unknown> {
  receive(): AsyncIterable<TComment[]>;
}
