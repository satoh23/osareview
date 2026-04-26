export type FindLiveStreamInput = {
  channelId: string;
};

export type FindLiveStreamResult = {
  liveStreamId: string;
  liveChatId: string;
};

export interface LiveStreamRepository {
  findLiveStream(
    input: FindLiveStreamInput,
  ): Promise<FindLiveStreamResult | null>;
}
