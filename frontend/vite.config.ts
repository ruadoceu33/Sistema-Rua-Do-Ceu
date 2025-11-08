import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Sistema Rua do Céu",
        short_name: "Rua do Céu",
        description: "Sistema completo para gestão de serviços beneficiários e doações para crianças",
        theme_color: "#4F93E8",
        background_color: "#E8F3FF",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Aniversários do Mês",
            short_name: "Aniversários",
            description: "Ver aniversários das crianças",
            url: "/aniversarios",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Check-in",
            short_name: "Check-in",
            description: "Fazer check-in de doações",
            url: "/checkin",
            icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
          },
        ],
        categories: ["productivity", "social", "utilities"],
        lang: "pt-BR",
        dir: "ltr",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
