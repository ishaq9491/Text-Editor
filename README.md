# 📝  Text Editor

A modern **real-time collaborative word editor** built using **React**, **Quill**, and **Socket.IO**, inspired by tools like Google Docs.  
It enables multiple users to edit the same document simultaneously with auto-save, dark mode, zoom controls, and export options.

---

## 🚀 Features

- **Real-time Collaboration**
  - Multiple users can edit the same document at the same time
  - Changes are synced instantly using WebSockets

- **Persistent Documents**
  - Each document is assigned a unique persistent ID
  - Automatically reloads the same document on refresh

- **Rich Text Editor**
  - Built with **Quill**
  - Supports headings, bold/italic, lists, alignment, code blocks, links, and images

- **Auto Save**
  - Document content is saved automatically at regular intervals

- **Dark & Light Mode**
  - Fully readable editor content in both modes
  - Improved dark-mode contrast for comfortable writing

- **Zoom & Print Layout**
  - Zoom levels: 100%, 125%, 150%
  - Print-friendly layout with accurate page height and page count

- **Export Options**
  - Download documents as:
    - 📄 PDF
    - 🌐 HTML
    - 📝 Plain Text (TXT)

---

## 🛠️ Tech Stack

- **Frontend:** React
- **Editor:** Quill
- **Real-time Communication:** Socket.IO
- **PDF Generation:** jsPDF
- **Styling:** Custom CSS (Design Tokens, Dark Mode)
- **State Management:** React Hooks

---
