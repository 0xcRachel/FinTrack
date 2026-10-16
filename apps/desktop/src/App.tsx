import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Loader2, PlugZap, TriangleAlert } from 'lucide-react';
import { apiGet } from './lib/api';
import type { DatabaseHealth, HealthStatus } from './types/api';

function StatusDot({ ok, pending }: { ok: boolean; pending: boolean }) {
  const color = pending ? 'bg-amber-400' : ok ? 'bg-emerald-400' : 'bg-red-400';
  return (
    <span className="relative flex h-3 w-3">
      {!pending && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${color}`} />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${color}`} />
    </span>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl">
      <header className="mb-4 flex items-center gap-3">
        <span className="text-violet-300">{icon}</span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function QueryState({
  isPending,
  isError,
  error,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  if (isPending)
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
      </p>
    );
  if (isError)
    return (
      <p className="flex items-center gap-2 text-sm text-red-300">
        <TriangleAlert className="h-4 w-4" />
        {error instanceof Error ? error.message : 'Request failed'}
      </p>
    );
  return null;
}

/**
 * Phase-1 connectivity proof: frontend → backend → MySQL.
 * Replaced by the real dashboard shell in Phase 3.
 */
export default function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiGet<HealthStatus>('/health', signal),
  });
  const db = useQuery({
    queryKey: ['health', 'database'],
    queryFn: ({ signal }) => apiGet<DatabaseHealth>('/health/database', signal),
  });

  const backendUp = health.data?.status === 'UP';
  const dbUp = db.data?.status === 'UP';

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">
          FinTrack · Phase 1
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Backend connectivity check
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          This screen proves the full chain{' '}
          <span className="tabular">React → Spring Boot → MySQL</span> before any
          financial workflows are built.
        </p>
      </header>

      <Card title="Spring Boot API" icon={<Activity className="h-5 w-5" />}>
        <div className="flex items-center gap-3">
          <StatusDot ok={backendUp} pending={health.isPending} />
          <p className="tabular text-sm">
            {health.data
              ? `${health.data.service} v${health.data.version} — ${health.data.status}`
              : 'Waiting for backend…'}
          </p>
        </div>
        <div className="mt-3">
          <QueryState isPending={health.isPending} isError={health.isError} error={health.error} />
        </div>
      </Card>

      <Card title="MySQL database" icon={<Database className="h-5 w-5" />}>
        <div className="flex items-center gap-3">
          <StatusDot ok={dbUp} pending={db.isPending} />
          <p className="tabular text-sm">
            {db.data
              ? `${db.data.product} ${db.data.dbVersion} — ${db.data.status}`
              : 'Waiting for database probe…'}
          </p>
        </div>
        <div className="mt-3">
          <QueryState isPending={db.isPending} isError={db.isError} error={db.error} />
        </div>
      </Card>

      <footer className="flex items-center gap-2 text-xs text-slate-500">
        <PlugZap className="h-3.5 w-3.5" />
        API base: <span className="tabular">{import.meta.env.VITE_API_BASE_URL}</span>
      </footer>
    </main>
  );
}
