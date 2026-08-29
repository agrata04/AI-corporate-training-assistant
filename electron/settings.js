import Store from 'electron-store';
import { safeStorage } from 'electron';

const store = new Store({ name: 'secure-settings' });

const API_KEY_FIELDS = [
  'geminiApiKey',
  'claudeApiKey',
  'openaiApiKey',
  'huggingfaceApiKey',
  'openrouterApiKey'
];

export function getSettings() {
  const apiKeys = Object.fromEntries(API_KEY_FIELDS.map((field) => [field, decryptField(field)]));

  return {
    ...apiKeys,
    aiProvider: store.get('aiProvider', 'gemini'),
    geminiModel: store.get('geminiModel', 'gemini-2.5-flash'),
    claudeModel: store.get('claudeModel', 'claude-3-5-sonnet-20241022'),
    openaiModel: store.get('openaiModel', 'gpt-4o-mini'),
    huggingfaceModel: store.get('huggingfaceModel', 'mistralai/Mistral-7B-Instruct-v0.3'),
    openrouterModel: store.get('openrouterModel', 'openai/gpt-4o-mini'),
    temperature: store.get('temperature', 0.4),
    maxOutputTokens: store.get('maxOutputTokens', 4096),
    theme: store.get('theme', 'light')
  };
}

export function saveSettings(settings) {
  for (const field of API_KEY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(settings, field)) {
      store.set(field, encryptValue(settings[field] || ''));
    }
  }

  store.set('aiProvider', settings.aiProvider || 'gemini');
  store.set('geminiModel', settings.geminiModel || 'gemini-2.5-flash');
  store.set('claudeModel', settings.claudeModel || 'claude-3-5-sonnet-20241022');
  store.set('openaiModel', settings.openaiModel || 'gpt-4o-mini');
  store.set('huggingfaceModel', settings.huggingfaceModel || 'mistralai/Mistral-7B-Instruct-v0.3');
  store.set('openrouterModel', settings.openrouterModel || 'openai/gpt-4o-mini');
  store.set('temperature', Number(settings.temperature ?? 0.4));
  store.set('maxOutputTokens', Number(settings.maxOutputTokens ?? 4096));
  store.set('theme', settings.theme || 'light');
  return getSettings();
}

function decryptField(field) {
  const encrypted = store.get(field);
  if (!encrypted) return '';
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      : Buffer.from(encrypted, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function encryptValue(value) {
  return safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(value).toString('base64')
    : Buffer.from(value, 'utf8').toString('base64');
}
