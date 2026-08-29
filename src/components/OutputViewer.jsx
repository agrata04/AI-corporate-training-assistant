import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './Button';
import { assistantApi } from '../services/api';

export function OutputViewer({ output }) {
  if (!output) {
    return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Generated content will appear here.</div>;
  }

  async function exportAs(format) {
    await toast.promise(
      assistantApi.outputs.export({
        outputId: output.id,
        projectId: output.project_id,
        title: output.title,
        content: output.content,
        format
      }),
      { loading: `Exporting ${format.toUpperCase()}...`, success: `${format.toUpperCase()} exported`, error: (err) => err.message }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{output.title}</h2>
        <div className="flex gap-2">
          {['docx', 'pdf', 'md', 'txt'].map((format) => (
            <Button key={format} variant="secondary" icon={Download} onClick={() => exportAs(format)}>{format.toUpperCase()}</Button>
          ))}
        </div>
      </div>
      <article className="prose max-w-none rounded-lg border border-slate-200 bg-white p-6 text-slate-800 dark:prose-invert dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{output.content}</ReactMarkdown>
      </article>
    </div>
  );
}
