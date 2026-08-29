import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, ClipboardCheck, Dumbbell, FileText, MailPlus, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { OutputViewer } from '../components/OutputViewer';
import { Field, inputClass } from '../components/Field';
import { assistantApi } from '../services/api';

const actions = [
  { key: 'lessonPlan', label: 'Lesson Plan', icon: BookOpen, description: 'Objectives, agenda, timing, activities, summary.' },
  { key: 'quiz', label: 'Quiz', icon: ClipboardCheck, description: 'MCQ, true/false, blanks, scenarios, answers.' },
  { key: 'exercises', label: 'Practical Exercises', icon: Dumbbell, description: 'Individual, team, hands-on, role play, case studies.' },
  { key: 'trainerNotes', label: 'Trainer Notes', icon: FileText, description: 'Talking points, definitions, examples, FAQs.' },
  { key: 'assignments', label: 'Content Pack', icon: MailPlus, description: 'Assignments, emails, worksheets, reflections.' }
];

export function Generator() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [contentType, setContentType] = useState('Assignments');
  const [loadingKey, setLoadingKey] = useState('');
  const [output, setOutput] = useState(null);

  useEffect(() => {
    assistantApi.projects.list().then((list) => {
      setProjects(list);
      setProjectId(list[0]?.id || '');
    });
  }, []);

  async function run(key) {
    if (!projectId) return toast.error('Select a project first');
    setLoadingKey(key);
    try {
      const payload = { projectId, difficulty, type: contentType };
      const result = await assistantApi.ai[key](payload);
      setOutput(result);
      toast.success('Generated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingKey('');
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="AI Generators" subtitle="Turn uploaded source documents into production-ready training assets." />
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-4 space-y-4">
          <Field label="Project">
            <select className={inputClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}
            </select>
          </Field>
          <Field label="Quiz Difficulty">
            <select className={inputClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </Field>
          <Field label="Content Type">
            <select className={inputClass} value={contentType} onChange={(event) => setContentType(event.target.value)}>
              <option>Assignments</option>
              <option>Homework</option>
              <option>Worksheets</option>
              <option>Icebreakers</option>
              <option>Poll Questions</option>
              <option>Reflection Questions</option>
              <option>Discussion Topics</option>
              <option>Email to Participants</option>
              <option>Follow-up Assignments</option>
            </select>
          </Field>
          <div className="grid gap-3">
            {actions.map((item) => (
              <button key={item.key} onClick={() => run(item.key)} className="rounded-lg border border-slate-200 p-4 text-left transition hover:border-brand hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-950/30">
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-brand" />
                  <div className="font-bold">{item.label}</div>
                  {loadingKey === item.key ? <Sparkles className="ml-auto h-4 w-4 animate-pulse text-brand" /> : null}
                </div>
                <div className="mt-1 text-sm text-slate-500">{item.description}</div>
              </button>
            ))}
          </div>
        </Card>
        <div className="col-span-8">
          <OutputViewer output={output} />
        </div>
      </div>
    </div>
  );
}
