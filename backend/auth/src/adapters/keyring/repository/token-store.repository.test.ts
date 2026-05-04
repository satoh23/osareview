import test from "node:test";
import assert from "node:assert/strict";
import { KeyringTokenStoreRepository } from "./token-store.repository.js";
import { TokenSet } from "../../../entities/token/token-set.js";

type StoreMap = Map<string, string>;

/** 本番の `AsyncEntry` と同じメソッド形のモック（リポジトリの内部型に export させない）。 */
type InMemoryKeyringEntry = {
  getPassword(): Promise<string | undefined>;
  setPassword(password: string): Promise<void>;
  deletePassword(): Promise<unknown>;
};

const mapKey = (service: string, account: string): string =>
  `${service}\0${account}`;

const createInMemoryEntryFactory = (store: StoreMap) => {
  return (service: string, account: string): InMemoryKeyringEntry => {
    const key = mapKey(service, account);
    return {
      async getPassword() {
        return store.has(key) ? store.get(key) : undefined;
      },
      async setPassword(password: string) {
        store.set(key, password);
      },
      async deletePassword() {
        store.delete(key);
      },
    };
  };
};

test("save のあと get で TokenSet が取れる", async () => {
  const store: StoreMap = new Map();
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(store),
  });
  const token = TokenSet.create({
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 99,
    scope: "s",
    obtainedAt: 1,
  });
  await repo.save("youtube", token);
  const got = await repo.get("youtube");
  assert.ok(got);
  assert.deepEqual(got.toPlain(), token.toPlain());
});

test("未保存なら get は null", async () => {
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(new Map()),
  });
  assert.equal(await repo.get("youtube"), null);
});

test("clear のあと get は null", async () => {
  const store: StoreMap = new Map();
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(store),
  });
  await repo.save(
    "youtube",
    TokenSet.create({
      accessToken: "x",
      refreshToken: "y",
      expiresAt: 1,
      scope: "z",
      obtainedAt: 0,
    }),
  );
  await repo.clear("youtube");
  assert.equal(await repo.get("youtube"), null);
});

test("clear は冪等（無くても例外にしない）", async () => {
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(new Map()),
  });
  await repo.clear("youtube");
});

test("不正 JSON なら get は null", async () => {
  const store: StoreMap = new Map();
  const key = mapKey("com.commentdock.auth.youtube", "default");
  store.set(key, "not-json");
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(store),
  });
  assert.equal(await repo.get("youtube"), null);
});

test("プロバイダごとに別エントリ", async () => {
  const store: StoreMap = new Map();
  const repo = new KeyringTokenStoreRepository({
    createEntry: createInMemoryEntryFactory(store),
  });
  await repo.save(
    "youtube",
    TokenSet.create({
      accessToken: "yt",
      refreshToken: "r1",
      expiresAt: 1,
      scope: "s1",
      obtainedAt: 0,
    }),
  );
  await repo.save(
    "twitch",
    TokenSet.create({
      accessToken: "tw",
      refreshToken: "r2",
      expiresAt: 2,
      scope: "s2",
      obtainedAt: 0,
    }),
  );
  assert.equal((await repo.get("youtube"))?.accessToken, "yt");
  assert.equal((await repo.get("twitch"))?.accessToken, "tw");
});
