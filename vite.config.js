import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var defaultAppsScriptUrl = "https://script.google.com/macros/s/AKfycbzqbFloToHKYwvHPMqxgacQNL43qE8gu0q055Nqzo1zYywm5XEP7S2Xu2WYPxGpaePE/exec";
var appsScriptProxyTargetUrl = new URL(process.env.APPS_SCRIPT_WEB_APP_URL || defaultAppsScriptUrl);
export default defineConfig({
    base: process.env.VITE_BASE_PATH || "/",
    plugins: [react()],
    server: {
        proxy: {
            "/api/apps-script": {
                target: appsScriptProxyTargetUrl.origin,
                changeOrigin: true,
                secure: true,
                followRedirects: true,
                rewrite: function (path) { return path.replace(/^\/api\/apps-script/, appsScriptProxyTargetUrl.pathname + appsScriptProxyTargetUrl.search); },
            },
        },
    },
});
