# AI Renderer Notes

The renderer calls AI capabilities through `src/services/api.js`, which forwards requests to the secure Electron preload bridge.

Gemini calls, RAG retrieval, and prompt construction live in `electron/geminiService.js` and `electron/rag.js` so API keys and local document text stay in the main process.
