# 📂 RAG (Retrieval-Augmented Generation) Document Repository

This directory contains reference curriculum documents, syllabus PDFs, textbook notes, and multimodal assets used by the **AI Curriculum Architect & RAG Grounding Studio** in **LabRecManager**.

## 📑 Included Documents

| Filename | Type | Description |
| :--- | :--- | :--- |
| **`python_math_library_syllabus.pdf`** | PDF | Official CBSE Class 11/12 Computer Science (083) syllabus for the Python `math` module (constants, rounding, powers, logarithms, trigonometry). |
| **`python_math_library_syllabus.txt`** | Text / Markdown | Plain text version of the syllabus for direct copy-pasting or text-based RAG grounding. |
| **`media_*.png / .jpg`** | Images | User-uploaded whiteboard / syllabus snapshots supported by Multimodal Vision RAG. |

## 🚀 How to Use in the Application

1. Open the **Training Module Wizard** from `/admin/training` -> **"Create New Module"**.
2. In **Step 1 (Blueprint & Meta)**, select the **"📄 Syllabus RAG"** toggle.
3. Attach any file from this folder (`.pdf`, `.txt`, or image) or copy-paste text from `python_math_library_syllabus.txt`.
4. Click **"✨ Synthesize Grounded Course (RAG)"**.
5. The AI automatically parses and synthesizes:
   - Course Metadata (English + Hindi titles, language, CBSE board, class level)
   - Structured Units with Pre-Lab theory and mini-checkpoints
   - Interactive Coding, MCQ, Assertion-Reason, and Bug Debugging exercises
   - All steps are automatically populated and unlocked!

## 🌐 Web Access
All files in `client/public/RAG/` are directly accessible via URL when the development server is running:
- PDF: `http://localhost:3000/RAG/python_math_library_syllabus.pdf`
- Text: `http://localhost:3000/RAG/python_math_library_syllabus.txt`
