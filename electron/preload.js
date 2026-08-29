import { contextBridge, ipcRenderer } from 'electron';

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('assistantAPI', {
  settings: {
    get: () => invoke('settings:get'),
    save: (settings) => invoke('settings:save', settings),
    test: () => invoke('settings:test')
  },
  projects: {
    list: () => invoke('projects:list'),
    create: (project) => invoke('projects:create', project),
    update: (project) => invoke('projects:update', project),
    duplicate: (id) => invoke('projects:duplicate', id),
    delete: (id) => invoke('projects:delete', id),
    import: () => invoke('projects:import'),
    export: (id) => invoke('projects:export', id),
    get: (id) => invoke('projects:get', id)
  },
  files: {
    upload: (projectId) => invoke('files:upload', projectId),
    list: (projectId) => invoke('files:list', projectId),
    recent: () => invoke('files:recent', null),
    remove: (id) => invoke('files:remove', id)
  },
  ai: {
    lessonPlan: (payload) => invoke('ai:lessonPlan', payload),
    quiz: (payload) => invoke('ai:quiz', payload),
    exercises: (payload) => invoke('ai:exercises', payload),
    trainerNotes: (payload) => invoke('ai:trainerNotes', payload),
    assignments: (payload) => invoke('ai:assignments', payload),
    summarize: (payload) => invoke('ai:summarize', payload),
    chat: (payload) => invoke('ai:chat', payload)
  },
  outputs: {
    list: (projectId) => invoke('outputs:list', projectId),
    save: (payload) => invoke('outputs:save', payload),
    export: (payload) => invoke('outputs:export', payload)
  },
  search: {
    all: (query) => invoke('search:all', query)
  },
  activity: {
    recent: () => invoke('activity:recent')
  },
  app: {
    getMeta: () => invoke('app:meta')
  }
});
