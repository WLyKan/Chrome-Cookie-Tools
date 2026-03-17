import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "/Chrome-Cookie-Tools/",
  plugins: [react()],
  server: {
    port: 5173,
  },
});
