import {
  runCommentFetcherApp,
  type Comment,
  type CommentOutputPort as FetcherCommentOutputPort,
  type RunCommentFetcherAppOptions,
} from "@comment-dock/comment-fetcher";
import { injectable } from "tsyringe";
import type { CommentSource } from "../../usecases/interfaces/comment-source.interface.js";

type RunFetcher = (
  options: RunCommentFetcherAppOptions,
  outputPort: FetcherCommentOutputPort,
) => Promise<void>;

@injectable()
export class CommentFetcherSource implements CommentSource {
  constructor(
    private readonly runFetcher: RunFetcher = runCommentFetcherApp,
    private readonly options: RunCommentFetcherAppOptions = {},
  ) {}

  async *receiveComments(): AsyncIterable<Comment[]> {
    const queue: Comment[][] = [];
    const state: {
      waitForNext: (() => void) | null;
      done: boolean;
      failure: unknown;
    } = {
      waitForNext: null,
      done: false,
      failure: undefined,
    };

    const notify = (): void => {
      if (!state.waitForNext) return;
      const resolve = state.waitForNext;
      state.waitForNext = null;
      resolve();
    };

    const outputPort: FetcherCommentOutputPort = {
      outputComments: async (comments) => {
        queue.push(comments);
        notify();
      },
    };

    this.runFetcher(this.options, outputPort)
      .then(() => {
        state.done = true;
        notify();
      })
      .catch((error: unknown) => {
        state.failure = error;
        state.done = true;
        notify();
      });

    while (true) {
      if (queue.length > 0) {
        const comments = queue.shift();
        if (comments) {
          yield comments;
          continue;
        }
      }

      if (state.done) {
        if (state.failure) {
          throw state.failure;
        }
        return;
      }

      await new Promise<void>((resolve) => {
        state.waitForNext = resolve;
      });
    }
  }
}
