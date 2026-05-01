import { Play, Square } from 'lucide-react';
import { useWorkSession, formatDuration } from '@/hooks/useWorkSession';
import { motion, AnimatePresence } from 'framer-motion';

export const SessionToggle = ({ compact = false }: { compact?: boolean }) => {
  const { active, start, stop, elapsedMs } = useWorkSession();

  if (compact) {
    return (
      <button
        onClick={() => (active ? stop() : start())}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
          active
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {active ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        <span className="tabular-nums">
          {active ? formatDuration(elapsedMs) : 'INICIAR'}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-card ${
        active ? 'border-primary bg-gradient-glow bg-surface' : 'border-border/40 bg-surface'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-up text-xs text-muted-foreground">Sessão de trabalho</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={active ? 'on' : 'off'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`display text-3xl tabular-nums ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {active ? formatDuration(elapsedMs) : '00:00:00'}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground mt-1">
            {active
              ? `Iniciada às ${new Date(active.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Toque para iniciar o turno'}
          </p>
        </div>
        <button
          onClick={() => (active ? stop() : start())}
          aria-label={active ? 'Parar sessão' : 'Iniciar sessão'}
          className={`size-14 rounded-2xl grid place-items-center shadow-fab active:scale-95 transition ${
            active ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
          }`}
        >
          {active ? <Square className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
        </button>
      </div>
    </div>
  );
};
