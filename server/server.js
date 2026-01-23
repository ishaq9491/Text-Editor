require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const Document = require("./Document");

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/google-docs-clone";
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// 🔐 SAFE find or create
async function findOrCreateDocument(id) {
  if (!id) return null;

  let document = await Document.findById(id);
  if (document) return document;

  document = await Document.create({
    _id: id,
    data: "",
  });

  return document;
}

io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("get-document", async (documentId) => {
    try {
      const document = await findOrCreateDocument(documentId);
      if (!document) return;

      socket.join(documentId);
      socket.emit("load-document", document.data);

      socket.on("send-changes", (delta) => {
        socket.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async (data) => {
        await Document.findByIdAndUpdate(documentId, { data });
      });
    } catch (err) {
      console.error("❌ Socket error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// Serve React build
const clientPath = path.join(__dirname, "..", "client", "build");

if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));

  app.get("*", (_, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
