import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["archive/**", "dist/**", "node_modules/**"],
  },
});
