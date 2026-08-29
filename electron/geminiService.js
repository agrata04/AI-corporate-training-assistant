import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSettings } from './settings.js';
import { retrieveContext } from './rag.js';

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    keyField: 'geminiApiKey',
    modelField: 'geminiModel'
  },
  claude: {
    label: 'Claude',
    keyField: 'claudeApiKey',
    modelField: 'claudeModel'
  },
  openai: {
    label: 'OpenAI',
    keyField: 'openaiApiKey',
    modelField: 'openaiModel'
  },
  huggingface: {
    label: 'Hugging Face',
    keyField: 'huggingfaceApiKey',
    modelField: 'huggingfaceModel'
  },
  openrouter: {
    label: 'OpenRouter',
    keyField: 'openrouterApiKey',
    modelField: 'openrouterModel'
  }
};

function getProviderSettings() {
  const settings = getSettings();
  const provider = PROVIDERS[settings.aiProvider] ? settings.aiProvider : 'gemini';
  const config = PROVIDERS[provider];
  const apiKey = settings[config.keyField];
  const model = settings[config.modelField];
  if (!apiKey) {
    throw new Error(`${config.label} API key is missing. Add it in Settings first.`);
  }
  return {
    provider,
    label: config.label,
    apiKey,
    model,
    temperature: Number(settings.temperature),
    maxOutputTokens: Number(settings.maxOutputTokens)
  };
}

function getGeminiModel(providerSettings) {
  const genAI = new GoogleGenerativeAI(providerSettings.apiKey);
  return genAI.getGenerativeModel({
    model: providerSettings.model,
    generationConfig: {
      temperature: providerSettings.temperature,
      maxOutputTokens: providerSettings.maxOutputTokens
    }
  });
}

export async function testAiConnection() {
  const text = await generateText('Reply with exactly one word: connected');
  return text.toLowerCase().includes('connected');
}

export async function generateLessonPlan(project, files) {
  return generateStructuredOutput(project, files, 'lesson-plan', `
Create a complete corporate training lesson plan with:
- Training Objectives
- Learning Outcomes
- Agenda
- Session Breakdown
- Timing
- Icebreakers
- Activities
- Group Discussions
- Q&A Sessions
- Summary
Return polished Markdown with clear headings and tables where useful.
`);
}

export async function generateQuiz(project, files, options = {}) {
  return generateStructuredOutput(project, files, 'quiz', `
Create a ${options.difficulty || 'Intermediate'} quiz using these question types:
MCQ, True or False, Fill in the Blanks, Scenario-based Questions, Short Answer, Long Answer.
Include answer key and rationale. Return Markdown.
`);
}

export async function generateExercises(project, files) {
  return generateStructuredOutput(project, files, 'practical-exercises', `
Generate practical exercises including individual activities, team activities, hands-on tasks,
mini projects, case studies, AI prompt exercises, and role playing exercises. Return Markdown.
`);
}

export async function generateTrainerNotes(project, files) {
  return generateStructuredOutput(project, files, 'trainer-notes', `
Generate trainer notes including key talking points, important definitions, analogies, examples,
common mistakes, FAQs, tips, and suggested demonstrations. Return Markdown.
`);
}

export async function createAssignments(project, files, type = 'Assignments') {
  return generateStructuredOutput(project, files, 'content', `
Generate ${type}: assignments, homework, worksheets, icebreakers, poll questions,
reflection questions, discussion topics, email to participants, and follow-up assignments as relevant.
Return Markdown.
`);
}

export async function summarizeDocument(file) {
  return generateText(`
Summarize this training source document for an instructional designer.
Include core ideas, audience implications, and activities suggested by the content.

Document: ${file.file_name}
${clip(file.extracted_text, 24000)}
`);
}

export async function chatWithDocuments(project, files, messages, question, allowGeneralKnowledge = false) {
  const context = retrieveContext(files, question);
  const contextBlock = context.length
    ? context.map((item) => `${item.label}\n${item.text}`).join('\n\n')
    : 'No directly relevant uploaded-document context was found.';
  const history = messages.slice(-10).map((message) => `${message.role}: ${message.content}`).join('\n');
  const guardrail = allowGeneralKnowledge
    ? 'The user allows general knowledge. Still prioritize uploaded documents and label any outside knowledge.'
    : 'Answer only from uploaded documents. If the answer is not present, say what is missing and suggest which document detail to upload.';

  const answer = await generateText(`
You are an AI Corporate Training Assistant for project "${project.project_name}".
${guardrail}

Conversation history:
${history}

Retrieved document context:
${contextBlock}

User question:
${question}

Answer in a concise, helpful trainer-facing style. Cite source file names when possible.
`);
  return {
    answer,
    sources: context.map((item) => item.label)
  };
}

async function generateStructuredOutput(project, files, type, instruction) {
  const sourceText = files.map((file) => `## ${file.file_name}\n${clip(file.extracted_text, 10000)}`).join('\n\n');
  return generateText(`
You are an expert corporate learning designer.

Project:
- Name: ${project.project_name}
- Client: ${project.client_name || 'Not specified'}
- Industry: ${project.industry || 'Not specified'}
- Audience: ${project.audience || 'Not specified'}
- Duration: ${project.duration || 'Not specified'}
- Training Goal: ${project.training_goal || 'Not specified'}

Use the uploaded source documents as the primary source of truth.

Task type: ${type}
${instruction}

Source documents:
${sourceText || 'No uploaded document text is available. Create a generic scaffold and clearly mark assumptions.'}
`);
}

function clip(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}\n\n[Content clipped locally for prompt size]` : value;
}

async function generateText(prompt) {
  const settings = getProviderSettings();
  if (settings.provider === 'gemini') return generateGeminiText(settings, prompt);
  if (settings.provider === 'claude') return generateClaudeText(settings, prompt);
  if (settings.provider === 'openai') return generateOpenAiText(settings, prompt);
  if (settings.provider === 'huggingface') return generateHuggingFaceText(settings, prompt);
  if (settings.provider === 'openrouter') return generateOpenRouterText(settings, prompt);
  throw new Error(`Unsupported AI provider: ${settings.provider}`);
}

async function generateGeminiText(settings, prompt) {
  const result = await getGeminiModel(settings).generateContent(prompt);
  return result.response.text();
}

async function generateClaudeText(settings, prompt) {
  const json = await postJson('https://api.anthropic.com/v1/messages', {
    model: settings.model,
    max_tokens: settings.maxOutputTokens,
    temperature: settings.temperature,
    messages: [{ role: 'user', content: prompt }]
  }, {
    'x-api-key': settings.apiKey,
    'anthropic-version': '2023-06-01'
  });
  return (json.content || []).map((part) => part.text || '').join('\n').trim();
}

async function generateOpenAiText(settings, prompt) {
  const json = await postJson('https://api.openai.com/v1/chat/completions', {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: settings.temperature,
    max_tokens: settings.maxOutputTokens
  }, {
    Authorization: `Bearer ${settings.apiKey}`
  });
  return json.choices?.[0]?.message?.content?.trim() || '';
}

async function generateOpenRouterText(settings, prompt) {
  const json = await postJson('https://openrouter.ai/api/v1/chat/completions', {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: settings.temperature,
    max_tokens: settings.maxOutputTokens
  }, {
    Authorization: `Bearer ${settings.apiKey}`,
    'HTTP-Referer': 'app://ai-corporate-training-assistant',
    'X-Title': 'AI Corporate Training Assistant'
  });
  return json.choices?.[0]?.message?.content?.trim() || '';
}

async function generateHuggingFaceText(settings, prompt) {
  const modelPath = settings.model.split('/').map(encodeURIComponent).join('/');
  const json = await postJson(`https://api-inference.huggingface.co/models/${modelPath}`, {
    inputs: prompt,
    parameters: {
      temperature: settings.temperature,
      max_new_tokens: settings.maxOutputTokens,
      return_full_text: false
    },
    options: {
      wait_for_model: true
    }
  }, {
    Authorization: `Bearer ${settings.apiKey}`
  });

  if (Array.isArray(json)) {
    return (json[0]?.generated_text || json[0]?.summary_text || '').trim();
  }
  return (json.generated_text || json.summary_text || json[0]?.generated_text || '').trim();
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const detail = json.error?.message || json.error || json.message || text || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return json;
}
