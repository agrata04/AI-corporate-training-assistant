import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { inputClass } from '../components/Field';
import { assistantApi } from '../services/api';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  async function run(next = query) {
    setQuery(next);
    setResults(next.trim() ? await assistantApi.search.all(next) : []);
  }

  return (
    <div className="p-8">
      <PageHeader title="Search" subtitle="Search projects, files, lesson plans, quizzes, and chat history." />
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input className={`${inputClass} pl-10`} value={query} onChange={(event) => run(event.target.value)} placeholder="Search training content..." />
      </div>
      <Card>
        <div className="space-y-3">
          {results.map((result) => (
            <div key={`${result.entity_type}-${result.entity_id}`} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-xs font-bold uppercase text-brand">{result.entity_type}</div>
              <div className="mt-1 font-bold">{result.title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: result.snippet }} />
            </div>
          ))}
          {!results.length ? <div className="text-sm text-slate-500">No results yet.</div> : null}
        </div>
      </Card>
    </div>
  );
}
