# AI Corporate Training Assistant

A cross-platform Electron desktop app for creating corporate training assets from local source documents using Gemini, Claude, OpenAI, Hugging Face, or OpenRouter.

The application works on the user's computer. Projects, uploaded files, extracted text, AI outputs, chat history, settings, and export history are stored locally. The only cloud dependency is the selected AI provider API, configured by the user in Settings.

## Features

- Secure Settings page for Gemini, Claude, OpenAI, Hugging Face, and OpenRouter API keys, model choices, temperature, max output tokens, and theme.
- Modern dashboard with recent projects, activity, file actions, and API status.
- Unlimited local projects with client, industry, audience, duration, goal, and files.
- Upload and parse PDF, PPT, PPTX, DOCX, and TXT files.
- Local SQLite persistence with full-text search.
- AI-powered lesson plans, quizzes, exercises, trainer notes, assignments, and summaries.
- RAG chatbot that retrieves local document chunks before calling the active AI provider.
- Exports to DOCX, PDF, Markdown, and TXT.
- Light and dark themes, keyboard menu shortcuts, toasts, loading states, and responsive desktop layouts.
- Windows installer build via electron-builder.

## Project Structure

```text
electron/        Main process, preload bridge, SQLite, parsing, AI providers, RAG, exports
src/             React renderer
src/components/  Reusable UI components
src/pages/       Dashboard, projects, generators, chat, search, settings
src/services/    Renderer API wrapper
src/hooks/       React hooks
src/database/    Renderer-side database notes
src/ai/          Renderer-side AI notes
src/utils/       Formatting helpers
src/assets/      Icons and visual assets
database/        Schema reference
ai/              Prompt architecture reference
assets/          Extra app assets
```

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

This starts Vite and Electron together. The renderer is served at `http://127.0.0.1:5173`.

## Build

```bash
npm run build
```

On Windows this creates:

- `release/AI Corporate Training Assistant Setup 1.0.0.exe`
- `release/win-unpacked/AI Corporate Training Assistant.exe`

The app is configured as an unsigned local build. Add a code-signing certificate and icon before distributing broadly.

## AI Provider Setup

1. Open Settings.
2. Choose an active provider: Gemini, Claude, OpenAI, Hugging Face, or OpenRouter.
3. Paste the API key for any provider you want to use.
4. Choose or type the model name for the active provider.
5. Set temperature and max output tokens.
6. Save, then use Test API.

API keys are never hardcoded. They are stored locally through Electron's secure storage when available.

## Local Data

Runtime data is stored under Electron's `userData` directory:

- SQLite database: `data/training-assistant.sqlite`
- Uploaded file copies: `uploads/`
- Exports: `exports/`
- Secure settings: Electron Store

## Notes

- Legacy `.ppt` files can be imported, but rich text extraction is best with `.pptx`.
- AI generation requires internet access for the selected AI provider.
- Search, project management, uploaded file storage, chat history, exports, and existing generated outputs work offline.
- `npm audit` reports transitive dependency advisories from the Electron packaging ecosystem. Review before public distribution.
