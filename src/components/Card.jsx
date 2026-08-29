import { twMerge } from 'tailwind-merge';

export function Card({ children, className }) {
  return (
    <section className={twMerge('rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900', className)}>
      {children}
    </section>
  );
}
