export const DELIVERY_DI_TOKENS = {
  commentSource: Symbol("delivery.commentSource"),
  commentDecorator: Symbol("delivery.commentDecorator"),
  commentOutputTarget: Symbol("delivery.commentOutputTarget"),
  commentOutputPort: Symbol("delivery.commentOutputPort"),
  websocketConfigProvider: Symbol("delivery.websocketConfigProvider"),
} as const;
