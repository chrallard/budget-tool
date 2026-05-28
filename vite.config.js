import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    base: process.env.VITE_BASE_PATH || "/",
    plugins: [react()],
    server: {
        proxy: {
            "/api/apps-script": {
                target: "https://script.google.com",
                changeOrigin: true,
                secure: true,
                followRedirects: true,
                rewrite: function (path) {
                    return path.replace(/^\/api\/apps-script/, "/macros/s/AKfycbzqbFloToHKYwvHPMqxgacQNL43qE8gu0q055Nqzo1zYywm5XEP7S2Xu2WYPxGpaePE/exec");
                },
            },
        },
    },
});
