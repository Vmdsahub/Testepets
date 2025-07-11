import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: ["react", "react-dom", "framer-motion"],
  },
  build: {
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
          supabase: ["@supabase/supabase-js"],
          icons: ["lucide-react"],
          routing: ["react-router-dom"],
          three: ["three"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Enable source maps for debugging (can be disabled for production)
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
  },
  // Preview server optimizations
  preview: {
    port: 4173,
    host: true,
  },
  // Dev server optimizations
  server: {
    port: 5173,
    host: true,
    // Enable HTTP/2
    https: false,
  },
  // CSS optimizations
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      css: {
        charset: false,
      },
    },
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove console and debugger in production
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
});
