import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const dirname = typeof __dirname !== "undefined" ? __dirname : fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
