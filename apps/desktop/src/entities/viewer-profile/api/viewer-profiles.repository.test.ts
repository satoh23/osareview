import { describe, expect, it } from "vitest";
import {
  getViewerProfile,
  listViewerProfiles,
} from "./viewer-profiles.repository";

describe("viewerProfilesRepository", () => {
  it("userId から mock ViewerProfile を取得できる", async () => {
    const profile = await getViewerProfile("u2");

    expect(profile).toMatchObject({
      userId: "u2",
      platform: "twitch",
      displayName: "mika_sub",
      statuses: ["regular", "supporter"],
    });
    expect(profile?.recentComments[0]?.text).toBe(
      "仕事終わりに来れた〜 今日も声かわいい",
    );
  });

  it("未知の userId は undefined を返す", async () => {
    await expect(getViewerProfile("missing-user")).resolves.toBeUndefined();
  });

  it("返却値は mock 本体を直接変更しないコピーになる", async () => {
    const profile = await getViewerProfile("u1");
    if (!profile) {
      throw new Error("profile should exist");
    }

    profile.tags.push("mutated");
    profile.recentComments[0]?.badges.push("mutated");

    const reloadedProfile = await getViewerProfile("u1");

    expect(reloadedProfile?.tags).not.toContain("mutated");
    expect(reloadedProfile?.recentComments[0]?.badges).not.toContain("mutated");
  });

  it("プロフィール一覧を取得できる", async () => {
    const profiles = await listViewerProfiles();

    expect(profiles.map((profile) => profile.userId)).toEqual([
      "u1",
      "u2",
      "u3",
      "u5",
      "u6",
      "u7",
    ]);
  });
});
