import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { container } from "tsyringe";
import type { AuthClient } from "@comment-dock/auth";
import { registerApiGatewayDependencies } from "./register-di-dependencies.js";
import { ManageAccountLinksUseCase } from "./usecases/manage-account-links.usecase.js";
import { ManageStreamingSessionsUseCase } from "./usecases/manage-streaming-sessions.usecase.js";
import { API_GATEWAY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";

test("ManageStreamingSessionsUseCase を DI で解決できる", () => {
  registerApiGatewayDependencies();

  const useCase = container.resolve(ManageStreamingSessionsUseCase);

  assert.ok(useCase instanceof ManageStreamingSessionsUseCase);
});

test("ManageAccountLinksUseCase を DI で解決できる", () => {
  registerApiGatewayDependencies();

  const useCase = container.resolve(ManageAccountLinksUseCase);

  assert.ok(useCase instanceof ManageAccountLinksUseCase);
});

test("AuthClient を Gateway の DI で解決できる", () => {
  registerApiGatewayDependencies();

  const authClient = container.resolve<AuthClient>(
    API_GATEWAY_DI_TOKENS.authClient,
  );

  assert.equal(typeof authClient.login, "function");
  assert.equal(typeof authClient.getLinkStatus, "function");
  assert.equal(typeof authClient.getValidAccessToken, "function");
  assert.equal(typeof authClient.withAuthorizedRequest, "function");
  assert.equal(typeof authClient.createAuthorizedTokenAccessor, "function");
  assert.equal(typeof authClient.onAuthorizationLost, "function");
  assert.equal(typeof authClient.refresh, "function");
  assert.equal(typeof authClient.logout, "function");
});
