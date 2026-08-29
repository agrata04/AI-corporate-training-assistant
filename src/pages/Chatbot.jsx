import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SendHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, inputClass } from '../components/Field';
import { assistantApi } from '../services/api';

export function Chatbot() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    assistantApi.projects.list().then((list) => {
      setProjects(list);
      if (list[0]) loadProject(list[0].id);
    });
  }, []);

  async function loadProject(id) {
    setProjectId(id);
    const project = await assistantApi.projects.get(id);
    setMessages(project.chat || []);
  }

  async function send() {
    if (!question.trim()) return;
    const current = question;
    setQuestion('');
    setMessages((items) => [...items, { id: `u-${Date.now()}`, role: 'user', content: current }]);
    setLoading(true);
    try {
      const response = await assistantApi.ai.chat({ projectId, question: current, allowGeneralKnowledge });
      setMessages((items) => [...items, { id: `a-${Date.now()}`, role: 'assistant', content: response.answer, sources: JSON.stringify(response.sources) }]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col p-8">
      <PageHeader title="AI Chatbot" subtitle="Ask questions against uploaded documents with local retrieval and conversation history." />
      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Project">
            <select className={inputClass} value={projectId} onChange={(event) => loadProject(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}
            </select>
          </Field>
          <label className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={allowGeneralKnowledge} onChange={(event) => setAllowGeneralKnowledge(event.target.checked)} />
            Allow general knowledge
          </label>
        </div>
      </Card>
      <Card className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-3xl rounded-lg p-4 ${message.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{message.content}</ReactMarkdown>
            </div>
          ))}
          {loading ? <div className="rounded-lg bg-slate-100 p-4 text-sm text-slate-500 dark:bg-slate-800">Thinking through the documents...</div> : null}
        </div>
      </Card>
      <div className="mt-4 flex gap-3">
        <textarea className={`${inputClass} min-h-12 flex-1 resize-none`} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) send();
        }} placeholder="Ask about concepts, slides, definitions, speaking notes, examples, or activities..." />
        <Button icon={SendHorizontal} loading={loading} onClick={send}>Send</Button>
      </div>
    </div>
  );
}
