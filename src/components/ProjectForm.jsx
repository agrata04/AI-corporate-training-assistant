import { Field, inputClass } from './Field';
import { Button } from './Button';

export const emptyProject = {
  project_name: '',
  client_name: '',
  industry: '',
  audience: '',
  duration: '',
  training_goal: ''
};

export function ProjectForm({ value, onChange, onSubmit, loading }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-2 gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <Field label="Project Name">
        <input className={inputClass} required value={value.project_name} onChange={(event) => update('project_name', event.target.value)} />
      </Field>
      <Field label="Client Name">
        <input className={inputClass} value={value.client_name} onChange={(event) => update('client_name', event.target.value)} />
      </Field>
      <Field label="Industry">
        <input className={inputClass} value={value.industry} onChange={(event) => update('industry', event.target.value)} />
      </Field>
      <Field label="Audience">
        <input className={inputClass} value={value.audience} onChange={(event) => update('audience', event.target.value)} />
      </Field>
      <Field label="Duration">
        <input className={inputClass} placeholder="2 hours, 1 day, 4 weeks" value={value.duration} onChange={(event) => update('duration', event.target.value)} />
      </Field>
      <div />
      <div className="col-span-2">
        <Field label="Training Goal">
          <textarea className={`${inputClass} min-h-28`} value={value.training_goal} onChange={(event) => update('training_goal', event.target.value)} />
        </Field>
      </div>
      <div className="col-span-2 flex justify-end">
        <Button loading={loading}>Save Project</Button>
      </div>
    </form>
  );
}
