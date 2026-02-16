import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

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
