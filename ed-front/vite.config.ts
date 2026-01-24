import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/basic-setup",
      "@codemirror/lang-python",
      "@codemirror/lang-javascript",
      "@codemirror/lang-cpp",
      "@codemirror/lang-java"
    ]
  }
});
