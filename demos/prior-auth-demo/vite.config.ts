import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const src = (p = ""): string => fileURLToPath(new URL(`./src${p ? `/${p}` : ""}`, import.meta.url));

// One self-contained dist/index.html (fonts and scripts inlined) so the demo opens by double-click.
// jsPDF imports html2canvas, canvg and dompurify on demand for helpers the PDF report does not use; they point at an empty module so they stay out of the file.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "@", replacement: src() },
      { find: /^(html2canvas|canvg|dompurify)$/, replacement: src("lib/pdf/empty-module.ts") },
    ],
  },
  server: { port: 5173, host: true },
});
