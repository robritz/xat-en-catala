import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    unstubGlobals: true,
    unstubEnvs: true,
    // A mutation run leaves copies of the tests in its sandbox.
    exclude: [...configDefaults.exclude, ".stryker-tmp/**"],
  },
});
