import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, PlugZap, Save } from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, inputClass } from '../components/Field';
import { assistantApi } from '../services/api';

const providers = [
  {
    id: 'gemini',
    label: 'Gemini',
    keyField: 'geminiApiKey',
    modelField: 'geminiModel',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash']
  },
  {
    id: 'claude',
    label: 'Claude',
    keyField: 'claudeApiKey',
    modelField: 'claudeModel',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyField: 'openaiApiKey',
    modelField: 'openaiModel',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1']
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    keyField: 'huggingfaceApiKey',
    modelField: 'huggingfaceModel',
    models: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Meta-Llama-3-8B-Instruct', 'google/flan-t5-large']
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyField: 'openrouterApiKey',
    modelField: 'openrouterModel',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-flash', 'meta-llama/llama-3.1-8b-instruct']
  }
];

export function Settings() {
  const [settings, setSettings] = useState({
    aiProvider: 'gemini',
    geminiApiKey: '',
    claudeApiKey: '',
    openaiApiKey: '',
    huggingfaceApiKey: '',
    openrouterApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    claudeModel: 'claude-3-5-sonnet-20241022',
    openaiModel: 'gpt-4o-mini',
    huggingfaceModel: 'mistralai/Mistral-7B-Instruct-v0.3',
    openrouterModel: 'openai/gpt-4o-mini',
    temperature: 0.4,
    maxOutputTokens: 4096,
    theme: 'light'
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    assistantApi.settings.get().then(setSettings).catch((err) => toast.error(err.message));
  }, []);

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await assistantApi.settings.save(settings);
      setSettings(saved);
      document.documentElement.classList.toggle('dark', saved.theme === 'dark');
      toast.success('Settings saved securely');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      await assistantApi.settings.save(settings);
      await assistantApi.settings.test();
      toast.success('AI provider connection works');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Settings" subtitle="Store provider API keys and generation defaults securely on this computer." />
      <Card className="max-w-5xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Active AI Provider">
            <select className={inputClass} value={settings.aiProvider} onChange={(event) => update('aiProvider', event.target.value)}>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
            </select>
          </Field>
          <Field label="Active Model">
            {providers.map((provider) => (
              provider.id === settings.aiProvider ? (
                <input
                  key={provider.id}
                  className={inputClass}
                  list={`${provider.id}-models`}
                  value={settings[provider.modelField] || ''}
                  onChange={(event) => update(provider.modelField, event.target.value)}
                  placeholder={`Enter ${provider.label} model`}
                />
              ) : null
            ))}
            {providers.map((provider) => (
              <datalist key={provider.id} id={`${provider.id}-models`}>
                {provider.models.map((model) => <option key={model} value={model} />)}
              </datalist>
            ))}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {providers.map((provider) => (
            <Field key={provider.id} label={`${provider.label} API Key`} hint="Never hardcoded. Stored with Electron safeStorage when available.">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  className={`${inputClass} pl-10`}
                  type="password"
                  value={settings[provider.keyField] || ''}
                  onChange={(event) => update(provider.keyField, event.target.value)}
                  placeholder={`Paste your ${provider.label} API key`}
                />
              </div>
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Temperature">
            <input className={inputClass} type="number" min="0" max="2" step="0.1" value={settings.temperature} onChange={(event) => update('temperature', event.target.value)} />
          </Field>
          <Field label="Max Output Tokens">
            <input className={inputClass} type="number" min="256" max="65536" step="256" value={settings.maxOutputTokens} onChange={(event) => update('maxOutputTokens', event.target.value)} />
          </Field>
        </div>
        <Field label="Theme">
          <select className={inputClass} value={settings.theme} onChange={(event) => update('theme', event.target.value)}>
            <option value="light">Light Theme</option>
            <option value="dark">Dark Theme</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={PlugZap} loading={testing} onClick={test}>Test API</Button>
          <Button icon={Save} loading={saving} onClick={save}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
