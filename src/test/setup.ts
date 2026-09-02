import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unmount between tests. Without this, a query can match an element left behind by a previous test.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom implements neither of these.
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
