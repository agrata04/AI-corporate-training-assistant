import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function Button({ children, className, variant = 'primary', loading = false, icon: Icon, ...props }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-blue-700',
    secondary: 'bg-white text-steel border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
    ghost: 'text-steel hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700'
  };
  return (
    <button
      className={twMerge('inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60', styles[variant], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
