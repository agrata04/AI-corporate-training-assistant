# Database Renderer Notes

SQLite is owned by the Electron main process in `electron/database.js`.

Renderer components never open the database directly. They use the typed IPC wrapper in `src/services/api.js`, keeping local persistence behind the desktop boundary.
