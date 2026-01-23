import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { jsPDF } from "jspdf";
import "./styles.css";

const SAVE_INTERVAL_MS = 2000;
const PAGE_HEIGHT = 1122;

const TOOLBAR_OPTIONS = [
  [{ font: [] }, { size: [] }],
  [{ header: [1, 2, 3, 4, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["blockquote", "code-block"],
  ["link", "image"],
  ["clean"],
];

/* 🔐 Persistent Document ID */
const getDocumentId = () => {
  let id = localStorage.getItem("documentId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("documentId", id);
  }
  return id;
};

function Editor() {
  const wrapperRef = useRef(null);
  const editorContainerRef = useRef(null);
  const downloadRef = useRef(null);

  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);

  const [darkMode, setDarkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [printLayout, setPrintLayout] = useState(true);
  const [showDownload, setShowDownload] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const documentIdRef = useRef(getDocumentId());

  /* Socket */
  useEffect(() => {
    const s = io("http://localhost:5000");
    setSocket(s);
    return () => s.disconnect();
  }, []);

  /* Quill Init */
  useEffect(() => {
    if (!wrapperRef.current) return;

    wrapperRef.current.innerHTML = "";
    const editor = document.createElement("div");
    wrapperRef.current.append(editor);

    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        history: { delay: 1000, maxStack: 100, userOnly: true },
      },
    });

    q.disable();
    q.setText("Loading document...");
    setQuill(q);
    editorContainerRef.current = editor;
  }, []);

  /* Collaboration */
  useEffect(() => {
    if (!socket || !quill) return;

    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
      quill.focus();
    });

    socket.emit("get-document", documentIdRef.current);

    const handler = (delta, old, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };

    quill.on("text-change", handler);

    socket.on("receive-changes", (delta) => {
      quill.updateContents(delta, "api");
    });

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      quill.off("text-change", handler);
      socket.off("receive-changes");
      clearInterval(interval);
    };
  }, [socket, quill]);

  /* Page Count */
  useEffect(() => {
    if (!quill || !editorContainerRef.current) return;

    const calculatePages = () => {
      const height =
        editorContainerRef.current.querySelector(".ql-editor")
          ?.scrollHeight || PAGE_HEIGHT;

      setPageCount(Math.max(1, Math.ceil(height / PAGE_HEIGHT)));
    };

    calculatePages();
    quill.on("text-change", calculatePages);
    return () => quill.off("text-change", calculatePages);
  }, [quill]);

  /* Close download on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setShowDownload(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* EXPORT FUNCTIONS */
  const exportPDF = () => {
    if (!quill) return;

    const pdf = new jsPDF("p", "pt", "a4");
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

    const lines = pdf.splitTextToSize(quill.getText(), pageWidth);
    let y = margin;

    lines.forEach((line) => {
      if (y > pageHeight) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 14;
    });

    pdf.save("document.pdf");
    setShowDownload(false);
  };

  const download = (content, type, name) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownload(false);
  };

  return (
    <div className={`word-app ${darkMode ? "dark" : ""}`}>
      <header className="word-header">
        <h1>Collaborative Word Editor</h1>
        <p>Real-time • Auto-save • Cloud</p>

        <div className="top-controls">
          <button className="btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>

          <select
            className="zoom-select"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
          </select>

          <button className="btn" onClick={() => setPrintLayout(!printLayout)}>
            {printLayout ? "📄 Print View" : "🧾 Normal"}
          </button>

          <button className="btn" onClick={() => setShowDownload((s) => !s)}>
            ⬇ Download
          </button>
        </div>

        {showDownload && (
          <div className="download-menu open" ref={downloadRef}>
            <div className="download-item" onClick={exportPDF}>
              📄 Export as PDF
            </div>
            <div
              className="download-item"
              onClick={() =>
                download(quill.root.innerHTML, "text/html", "document.html")
              }
            >
              🌐 Export as HTML
            </div>
            <div
              className="download-item"
              onClick={() =>
                download(quill.getText(), "text/plain", "document.txt")
              }
            >
              📝 Export as TXT
            </div>
          </div>
        )}
      </header>

      {/* ✅ CENTER FIX ONLY */}
      <div className="editor-shell">
        <div
          className="page-zoom-wrapper"
          style={{ transform: `scale(${zoom})` }}
        >
          <div
            ref={wrapperRef}
            className={`page ${printLayout ? "print" : ""}`}
          />
        </div>
      </div>

      <footer className="page-indicator">Pages: {pageCount}</footer>
    </div>
  );
}

export default Editor;
