import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: ["**/node_modules_corrupt/**"],
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream", "events", "crypto", "vm"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "NewsAI — AI-Powered News Reader",
        short_name: "NewsAI",
        description: "AI-powered news intelligence with summaries, bias detection, and personalized feeds.",
        theme_color: "#10B981",
        background_color: "#030712",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/screenshot-desktop.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide"
          },
          {
            src: "/screenshot-mobile.png",
            sizes: "720x1280",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/v1\/explore\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "explore-api", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 15 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'ui-libs': ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'lucide-react', 'framer-motion', 'clsx', 'tailwind-merge'],
          'solana-vendor': ['@solana/web3.js', '@solana/wallet-adapter-react', '@solana/wallet-adapter-base'],
          'charts': ['recharts'],
        },
      },
    },
  },
}));
