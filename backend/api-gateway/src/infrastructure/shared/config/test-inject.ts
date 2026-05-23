export const getTestInjectEnabled = (): boolean =>
  process.env.API_GATEWAY_ENABLE_TEST_INJECT === "true";
