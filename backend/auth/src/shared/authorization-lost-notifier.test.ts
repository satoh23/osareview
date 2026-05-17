import test from "node:test";
import assert from "node:assert/strict";
import {
  type AuthorizationLostEvent,
  AuthorizationLostNotifier,
} from "./authorization-lost-notifier.js";

const makeEvent = (): AuthorizationLostEvent => ({
  provider: "youtube",
  reason: "reason",
  occurredAt: 1_700_000_000_000,
});

test("subscribe した listener に emit した event を渡す", () => {
  const notifier = new AuthorizationLostNotifier();
  const received: AuthorizationLostEvent[] = [];

  notifier.subscribe((event) => received.push(event));
  const event = makeEvent();
  notifier.emit(event);

  assert.deepEqual(received, [event]);
});

test("複数 listener に同じ event を順番に渡す", () => {
  const notifier = new AuthorizationLostNotifier();
  const calls: string[] = [];
  const event = makeEvent();

  notifier.subscribe(() => calls.push("first"));
  notifier.subscribe(() => calls.push("second"));
  notifier.emit(event);

  assert.deepEqual(calls, ["first", "second"]);
});

test("unsubscribe 後の listener には event を渡さない", () => {
  const notifier = new AuthorizationLostNotifier();
  const received: AuthorizationLostEvent[] = [];

  const unsubscribe = notifier.subscribe((event) => received.push(event));
  unsubscribe();
  notifier.emit(makeEvent());

  assert.deepEqual(received, []);
});
