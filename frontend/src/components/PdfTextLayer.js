"use client";

import React from "react";
import dynamic from "next/dynamic";

// Load react-pdf only on client to avoid 'canvas' resolution during SSR
const ReactPDF = dynamic(() => import("react-pdf"), { ssr: false });

export default function PdfTextLayer({ file, pageNumber = 1, onLoaded, width = 900 }) {
  // Guard: if not in browser, render nothing
  if (typeof window === "undefined") return null;

  const { Document, Page, pdfjs } = require("react-pdf");
  // Avoid requiring CSS via JS to prevent HMR factory issues; styles are added in globals.css
  // Configure worker
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  return (
    <div style={{ userSelect: 'text' }}>
      <Document
        file={file}
        loading={<div className="p-6 text-slate-200">PDF yükleniyor…</div>}
        onLoadSuccess={({ numPages }) => onLoaded && onLoaded(numPages)}
        options={{
          standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
        }}
      >
        <Page pageNumber={pageNumber} width={width} renderAnnotationLayer={false} renderTextLayer={true} />
      </Document>
    </div>
  );
}


