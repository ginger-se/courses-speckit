import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { fileURLToPath } from "url";

const shared = fileURLToPath(new URL("../backend/app/shared", import.meta.url));

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: false })],
  resolve: {
    alias: { "@shared": shared },
    dedupe: ["zod"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
  },
});
