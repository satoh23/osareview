import test from "node:test";
import assert from "node:assert/strict";
import { generatePkcePair, toCodeChallengeS256 } from "./pkce.js";

test("toCodeChallengeS256: RFC 7636 appendix B の既知ベクトル", () => {
  const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  assert.equal(toCodeChallengeS256(codeVerifier), expected);
});

test("generatePkcePair: verifier/challenge/method を返す", () => {
  const pkce = generatePkcePair();
  assert.equal(pkce.codeChallengeMethod, "S256");
  assert.match(pkce.codeVerifier, /^[A-Za-z0-9\-_]{43,128}$/);
  assert.equal(pkce.codeChallenge, toCodeChallengeS256(pkce.codeVerifier));
});
