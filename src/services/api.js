const api = window.assistantAPI;

function requireBridge() {
  if (!api) {
    throw new Error('Electron preload bridge did not load. Restart the desktop app or rebuild the package.');
  }
  return api;
}

async function call(fn, ...args) {
  const response = await fn(...args);
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

export const assistantApi = {
  settings: {
    get: () => call(() => requireBridge().settings.get()),
    save: (settings) => call(() => requireBridge().settings.save(settings)),
    test: () => call(() => requireBridge().settings.test())
  },
  projects: {
    list: () => call(() => requireBridge().projects.list()),
    get: (id) => call(() => requireBridge().projects.get(id)),
    create: (project) => call(() => requireBridge().projects.create(project)),
    update: (project) => call(() => requireBridge().projects.update(project)),
    duplicate: (id) => call(() => requireBridge().projects.duplicate(id)),
    delete: (id) => call(() => requireBridge().projects.delete(id)),
    export: (id) => call(() => requireBridge().projects.export(id)),
    import: () => call(() => requireBridge().projects.import())
  },
  files: {
    upload: (projectId) => call(() => requireBridge().files.upload(projectId)),
    list: (projectId) => call(() => requireBridge().files.list(projectId)),
    recent: () => call(() => requireBridge().files.recent()),
    remove: (id) => call(() => requireBridge().files.remove(id))
  },
  ai: {
    lessonPlan: (payload) => call(() => requireBridge().ai.lessonPlan(payload)),
    quiz: (payload) => call(() => requireBridge().ai.quiz(payload)),
    exercises: (payload) => call(() => requireBridge().ai.exercises(payload)),
    trainerNotes: (payload) => call(() => requireBridge().ai.trainerNotes(payload)),
    assignments: (payload) => call(() => requireBridge().ai.assignments(payload)),
    summarize: (payload) => call(() => requireBridge().ai.summarize(payload)),
    chat: (payload) => call(() => requireBridge().ai.chat(payload))
  },
  outputs: {
    list: (projectId) => call(() => requireBridge().outputs.list(projectId)),
    save: (payload) => call(() => requireBridge().outputs.save(payload)),
    export: (payload) => call(() => requireBridge().outputs.export(payload))
  },
  search: {
    all: (query) => call(() => requireBridge().search.all(query))
  },
  activity: {
    recent: () => call(() => requireBridge().activity.recent())
  },
  app: {
    getMeta: () => call(() => requireBridge().app.getMeta())
  }
};
