import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

// Kept separate from vite.config.ts so the dev server config isn't tangled with test config.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Components need a document to render into. So no layout tests for now.
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
      },
    },
  })
);
