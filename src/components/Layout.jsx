import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Bot, FileText, GraduationCap, Home, Moon, Search, Settings, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assistantApi } from '../services/api';

const nav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/projects', label: 'Projects', icon: FileText },
  { to: '/generator', label: 'Generators', icon: GraduationCap },
  { to: '/chat', label: 'AI Chatbot', icon: Bot },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export function Layout() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    assistantApi.settings.get().then((settings) => {
      setDark(settings.theme === 'dark');
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }).catch(() => {});
  }, []);

  async function toggleTheme() {
    const settings = await assistantApi.settings.get();
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    await assistantApi.settings.save({ ...settings, theme: next ? 'dark' : 'light' });
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-100">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-brand">AI Corporate</div>
            <div className="text-lg font-bold leading-tight">Training Assistant</div>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  isActive ? 'bg-blue-50 text-brand dark:bg-blue-950/60' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={toggleTheme}
          className="mt-auto flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Light Theme' : 'Dark Theme'}
        </button>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
