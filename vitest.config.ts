import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    passWithNoTests: false,
    clearMocks: true,
    restoreMocks: true,
    server: {
      deps: {
        // next-auth's ESM build imports "next/server" without a file extension,
        // which Node's native ESM loader cannot resolve. Let Vite resolve it.
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
