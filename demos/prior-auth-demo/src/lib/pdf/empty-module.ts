/* jsPDF loads html2canvas, canvg and dompurify only for its HTML-to-PDF and SVG helpers, which the report never uses.
   vite.config.ts points those three imports here so they are not bundled into the single-file build. */
export default undefined;
