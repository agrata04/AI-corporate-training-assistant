import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Download, FileUp, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { ProjectForm, emptyProject } from '../components/ProjectForm';
import { assistantApi } from '../services/api';
import { formatBytes, formatDate } from '../utils/format';

export function Projects() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyProject);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const list = await assistantApi.projects.list();
    setProjects(list);
    if (!selected && list[0]) selectProject(list[0]);
  }

  async function selectProject(project) {
    setSelected(project);
    setForm(project);
    setFiles(await assistantApi.files.list(project.id));
  }

  async function saveProject() {
    setLoading(true);
    try {
      const saved = form.id ? await assistantApi.projects.update(form) : await assistantApi.projects.create(form);
      toast.success('Project saved');
      setSelected(saved);
      setForm(saved);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFiles() {
    if (!selected) return toast.error('Create or select a project first');
    await toast.promise(assistantApi.files.upload(selected.id), {
      loading: 'Extracting document text...',
      success: 'Files uploaded',
      error: (err) => err.message
    });
    setFiles(await assistantApi.files.list(selected.id));
  }

  async function duplicateProject() {
    const copy = await assistantApi.projects.duplicate(selected.id);
    toast.success('Project duplicated');
    await refresh();
    await selectProject(copy);
  }

  async function deleteProject() {
    if (!selected) return;
    await assistantApi.projects.delete(selected.id);
    toast.success('Project deleted');
    setSelected(null);
    setForm(emptyProject);
    setFiles([]);
    await refresh();
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Projects"
        subtitle="Create unlimited training projects, attach source files, and keep extracted text local."
        actions={<Button onClick={() => { setSelected(null); setForm(emptyProject); setFiles([]); }}>New Project</Button>}
      />
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-4">
          <h2 className="mb-4 text-lg font-bold">Project Library</h2>
          <div className="max-h-[680px] space-y-2 overflow-auto pr-1 scrollbar-thin">
            {projects.map((project) => (
              <button key={project.id} onClick={() => selectProject(project)} className={`w-full rounded-md border p-3 text-left transition ${selected?.id === project.id ? 'border-brand bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'}`}>
                <div className="font-bold">{project.project_name}</div>
                <div className="text-xs text-slate-500">{project.client_name || 'No client'} · {formatDate(project.updated_at)}</div>
              </button>
            ))}
          </div>
        </Card>
        <div className="col-span-8 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{form.id ? 'Edit Project' : 'Create Project'}</h2>
              {selected ? (
                <div className="flex gap-2">
                  <Button variant="secondary" icon={Copy} onClick={duplicateProject}>Duplicate</Button>
                  <Button variant="secondary" icon={Download} onClick={() => assistantApi.projects.export(selected.id)}>Export</Button>
                  <Button variant="danger" icon={Trash2} onClick={deleteProject}>Delete</Button>
                </div>
              ) : null}
            </div>
            <ProjectForm value={form} onChange={setForm} onSubmit={saveProject} loading={loading} />
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Files</h2>
              <Button variant="secondary" icon={FileUp} onClick={uploadFiles}>Upload Files</Button>
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Drag-and-drop ready workflow: use Upload Files to add PDF, PPT, PPTX, DOCX, or TXT sources.
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
                  <tr><th className="p-3">File Name</th><th>Size</th><th>Pages</th><th>Upload Date</th></tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="p-3 font-semibold">{file.file_name}</td>
                      <td>{formatBytes(file.file_size)}</td>
                      <td>{file.pages || '-'}</td>
                      <td>{formatDate(file.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
