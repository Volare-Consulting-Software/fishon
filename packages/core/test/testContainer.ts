import { container } from "tsyringe";
import { Mock } from "moq.ts";
import { TOKENS } from "../src/interfaces";
import { DEFAULT_CONFIG } from "../src/config";

type TokenKey = keyof typeof TOKENS;

type MockRegistrations = {
  [K in TokenKey]?: Mock<unknown>;
};

/**
 * Resets the DI container and registers mock instances for the provided tokens.
 * Always registers DEFAULT_CONFIG unless a Config mock is provided.
 */
export function registerMocks(mocks: MockRegistrations): void {
  container.reset();

  for (const [key, mock] of Object.entries(mocks)) {
    const token = TOKENS[key as TokenKey];
    container.register(token, { useValue: (mock as Mock<unknown>).object() });
  }

  if (!mocks.ForecastServiceConfig) {
    container.register(TOKENS.ForecastServiceConfig, { useValue: DEFAULT_CONFIG });
  }
}

export { container };
