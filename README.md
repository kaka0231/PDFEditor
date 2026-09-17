# PDFEditor

A modern, privacy-first, full-featured document processing suite built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Express**. 

PDFEditor runs **100% client-side** in your browser for document processing — your confidential contracts, PDFs, and images are never uploaded to any remote server for conversion or editing.

---

## ✨ Features

### 1. 📝 PDF Online Editor & Annotator
- **Visual Page Navigation**: High-resolution vector canvas rendering with smooth zoom, rotation, and thumbnail overview.
- **Annotation Tools**:
  - **Text Tool**: Insert custom text with adjustable font size, colors, and positioning.
  - **Pen & Highlighter**: Smooth freehand brush and semi-transparent highlighter.
  - **Whiteout / Redaction**: Block out sensitive text and data with precision masking.
- **E-Signature Studio**:
  - Draw handwritten signatures with mouse/touch screen.
  - Generate cursive signatures using elegant typography.
  - Upload existing signature image files with auto background removal.
- **Page Management**:
  - Reorder pages via intuitive drag-and-drop.
  - Duplicate, delete, or rotate individual pages.
- **Export**: Real-time compilation into clean vector PDFs using `pdf-lib`.

---

### 2. 🔄 PDF to Word (.docx)
- Converts PDF documents directly to editable **Microsoft Word (.docx)** format.
- Extracts text hierarchies, headings, paragraphs, and list items.
- Also supports exporting raw text (`.txt`) and Markdown (`.md`).
- Client-side extraction powered by `pdfjs-dist` and `docx`.

---

### 3. 📄 Word (.docx) to PDF & PDF/A Archival Format
- Instant in-browser preview of Word documents.
- Export to standard PDF or **ISO 19005 compliant PDF/A** archival formats:
  - **PDF/A-1b** (ISO 19005-1:2005)
  - **PDF/A-2b** (ISO 19005-2:2011)
- Automatically embeds standard sRGB color profiles (`/OutputIntents`) and XMP archival metadata.
- **No external conversion API required** — runs completely offline in the client.

---

### 4. 🖼️ Images to PDF (Scanner & Batch Converter)
- Batch upload photos, camera snapshots, or scanned receipts (JPG, PNG, WEBP).
- **Document Enhancement Filters**:
  - Document Scan (High Contrast B&W)
  - Grayscale
  - Vibrant & Auto-Enhance
- Reorder pages, select margins (none, standard, compact), and export to a unified PDF document.

---

### 5. 🤖 Optional Gemini AI Assistant
- Integrated with Google Gemini (`gemini-2.5-flash`) for:
  - **Smart Summarization**: Extract key clauses, dates, and executive summaries.
  - **Document Translation**: Instant translation between Chinese, English, and other languages.
  - **OCR Assist**: Transcribe scanned or image-based PDF text.
- *Note: AI features are optional. All core PDF editing and conversion tools work completely without an API key.*

---

### 6. 🌐 Bilingual Interface
- Built-in one-click language toggle between **Traditional Chinese (繁體中文)** and **English**.

---

## 🔒 Privacy & Security

- **Zero Document Leakage**: Document parsing, editing, signature generation, and file conversion are performed directly within your browser session using Web Workers and HTML5 Canvas.
- **No Database / No Storage**: Documents are discarded from memory when the browser tab is closed.

---

## 🛠️ Tech Stack

- **Framework**: React 19, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4, Lucide React icons, Motion animations
- **PDF & Document Engines**:
  - `pdf-lib` (PDF manipulation, annotation merging, page reordering)
  - `pdfjs-dist` (PDF rendering & text extraction)
  - `docx` & `mammoth` (Word document generation & parsing)
  - `jspdf` (Image-to-PDF compilation)
- **Backend**: Express (Node.js LTS), `@google/genai`
- **Build Tool**: Vite + `esbuild` (Single-bundle CJS server output for production)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or v22 LTS
- **npm**: v10+

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/kaka0231/PDFEditor.git
   cd PDFEditor
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. (Optional) Set up Gemini AI API Key:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   PORT=3000
   ```

### Development
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### Production Build
Compile both the frontend static bundle and backend server:
```bash
npm run build
```
Run the production server:
```bash
npm run start
```

---

## 🌐 GitHub Pages Deployment

This project includes automated continuous deployment to GitHub Pages via GitHub Actions:
- **Live Application**: [https://kaka0231.github.io/PDFEditor/](https://kaka0231.github.io/PDFEditor/)
- **Workflow**: Automated build and deployment defined in `.github/workflows/deploy-pages.yml` (triggered on pushes to `main`).
- **Setup**: In your repository **Settings** > **Pages**, set **Source** to **GitHub Actions**.

---

## 📄 License

MIT License. Free for personal and commercial use.
