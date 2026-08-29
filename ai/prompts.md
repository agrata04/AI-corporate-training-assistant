# Prompt Architecture

The application uses role-specific prompts for:

- Lesson plans
- Quizzes
- Practical exercises
- Trainer notes
- Document chat
- Assignments and content packs

Prompt implementation is in `electron/geminiService.js`. Retrieval context is assembled locally by `electron/rag.js` before sending a request to Gemini.
