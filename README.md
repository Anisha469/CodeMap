# CodeMap

### AI-Powered Codebase Intelligence Platform

CodeMap is a full-stack developer tool that helps developers understand unfamiliar GitHub repositories using repository indexing, code search, AI-powered question answering, architecture visualization, dependency analysis, and AI-powered impact analysis.

## 🚀 Features

- 🔗 **GitHub Repository Indexing**
  - Import public GitHub repositories
  - Index source files and their contents

- 🔍 **Codebase Search**
  - Search across repository files
  - Rank relevant files based on paths, filenames, and content

- 🤖 **AI Codebase Q&A**
  - Ask questions about the repository
  - Generate context-grounded answers using repository code

- 🏗️ **Architecture Visualization**
  - Visualize relationships between source files
  - Detect local imports and dependencies

- 💥 **Impact Analysis**
  - Select a source file and identify directly affected files
  - Analyze reverse dependencies

- 🧠 **AI Impact Explanation**
  - Explain why affected files depend on the changed file
  - Ground explanations in the actual repository context

- 📄 **Code Viewer**
  - Browse indexed source files
  - View code with line-level highlighting

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Axios
- React Router
- React Flow

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Axios

### AI
- Google Gemini API
- Retrieval-Augmented Generation (RAG)

### Deployment
- Render

## 🏗️ Architecture

```text
GitHub Repository
        ↓
Repository Indexing
        ↓
MongoDB
        ↓
Code Search
        ↓
Relevant Repository Context
        ↓
Gemini AI
        ↓
Codebase Q&A / Impact Explanation
