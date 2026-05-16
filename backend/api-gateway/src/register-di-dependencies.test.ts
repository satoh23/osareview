import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { container } from "tsyringe";
import { registerApiGatewayDependencies } from "./register-di-dependencies.js";
import { ManageStreamingSessionsUseCase } from "./usecases/manage-streaming-sessions.usecase.js";

test("ManageStreamingSessionsUseCase を DI で解決できる", () => {
  registerApiGatewayDependencies();

  const useCase = container.resolve(ManageStreamingSessionsUseCase);

  assert.ok(useCase instanceof ManageStreamingSessionsUseCase);
});
