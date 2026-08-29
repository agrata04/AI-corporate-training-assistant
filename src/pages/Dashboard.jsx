import { Link } from 'react-router-dom';
import { CheckCircle2, FilePlus2, FolderPlus, PlugZap } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { assistantApi } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../utils/format';

export function Dashboard() {
  const projects = useAsync(() => assistantApi.projects.list(), []);
  const activity = useAsync(() => assistantApi.activity.recent(), []);
  const settings = useAsync(() => assistantApi.settings.get(), []);

  const recentProjects = projects.data || [];
  const recentActivity = activity.data || [];
  const providerLabels = {
    gemini: 'Gemini',
    claude: 'Claude',
    openai: 'OpenAI',
    huggingface: 'Hugging Face',
    openrouter: 'OpenRouter'
  };
  const providerKeyFields = {
    gemini: 'geminiApiKey',
    claude: 'claudeApiKey',
    openai: 'openaiApiKey',
    huggingface: 'huggingfaceApiKey',
    openrouter: 'openrouterApiKey'
  };
  const activeProvider = settings.data?.aiProvider || 'gemini';
  const connected = Boolean(settings.data?.[providerKeyFields[activeProvider]]);

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Plan, generate, search, and export corporate training material from local source documents."
        actions={<Link to="/projects"><Button icon={FolderPlus}>Create New Project</Button></Link>}
      />
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-sm font-semibold text-slate-500">Recent Projects</div>
          <div className="mt-3 text-3xl font-bold">{recentProjects.length}</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-500">AI Credits Status</div>
          <div className={`mt-3 flex items-center gap-2 text-sm font-bold ${connected ? 'text-mint' : 'text-ember'}`}>
            {connected ? <CheckCircle2 className="h-5 w-5" /> : <PlugZap className="h-5 w-5" />}
            {connected ? `${providerLabels[activeProvider]} connected` : `${providerLabels[activeProvider]} key needed`}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-500">Upload Files</div>
          <Link className="mt-3 inline-flex" to="/projects"><Button variant="secondary" icon={FilePlus2}>Add Sources</Button></Link>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-500">Offline Access</div>
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Projects, files, history, and exports stay local.</div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-5 gap-6">
        <Card className="col-span-3">
          <h2 className="mb-4 text-lg font-bold">Recent Projects</h2>
          <div className="space-y-3">
            {recentProjects.slice(0, 6).map((project) => (
              <Link key={project.id} to="/projects" className="block rounded-md border border-slate-200 p-4 transition hover:border-brand hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-blue-950/30">
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-bold">{project.project_name}</div>
                    <div className="text-sm text-slate-500">{project.client_name || 'No client'} · {project.industry || 'No industry'}</div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(project.updated_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="col-span-2">
          <h2 className="mb-4 text-lg font-bold">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="border-l-2 border-brand pl-3">
                <div className="text-sm font-semibold">{item.action}</div>
                <div className="text-xs text-slate-500">{item.detail}</div>
                <div className="mt-1 text-xs text-slate-400">{formatDate(item.created_at)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
