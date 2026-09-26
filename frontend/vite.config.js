import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import dns from "dns";
import { fileURLToPath } from "url";
import { searchForWorkspaceRoot } from "vite";

const shared = fileURLToPath(new URL("../backend/app/shared", import.meta.url));

dns.setDefaultResultOrder("verbatim");

export default () => {
  const baseURL = process.env.APP_ENV === "development" ? "/" : "/";
  return defineConfig({
    plugins: [vue(), vuetify({ autoImport: false })],
    server: {
      host: "localhost",
      port: 8082,
      fs: { allow: [searchForWorkspaceRoot(process.cwd()), shared] },
    },
    base: baseURL,
    resolve: {
      alias: { "@shared": shared },
      dedupe: ["zod"],
    },
  });
};
