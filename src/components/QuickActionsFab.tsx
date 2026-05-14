import { useState } from 'react';
import { Plus, X, Route, Calendar, Clock, Fuel, Wrench, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const actions = [
  { to: '/rota/nova', label: 'Lançar Ganhos por Rota', Icon: Route, group: 'RECEITA' },
  { to: '/total-dia', label: 'Lançar Ganho Total do Dia', Icon: Calendar, group: 'RECEITA' },

  { to: '/despesa/combustivel', label: 'Combustível', Icon: Fuel, group: 'DESPESAS' },
  { to: '/despesa/manutencao', label: 'Manutenção', Icon: Wrench, group: 'DESPESAS' },
  { to: '/despesa/alimentacao', label: 'Alimentação', Icon: UtensilsCrossed, group: 'DESPESAS' },
];

export const QuickActionsFab = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const groups = ['RECEITA', 'DESPESAS'] as const;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed inset-x-0 bottom-28 z-50 mx-auto w-full max-w-[480px] px-5"
          >
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g} className="rounded-2xl bg-surface border border-border/60 overflow-hidden shadow-card">
                  <div className="px-4 py-3 border-b border-border/40 label-up text-sm text-primary">
                    {g}
                  </div>
                  <ul>
                    {actions
                      .filter((a) => a.group === g)
                      .map(({ to, label, Icon }) => (
                        <li key={to}>
                          <button
                            onClick={() => {
                              setOpen(false);
                              navigate(to);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-high active:scale-[0.98] transition text-left"
                          >
                            <span className="size-9 grid place-items-center rounded-lg bg-surface-high text-primary">
                              <Icon className="size-5" />
                            </span>
                            <span className="font-semibold">{label}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
        className="fixed bottom-24 right-5 z-50 size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-fab active:scale-95 transition"
        style={{ left: 'auto' }}
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }}>
          {open ? <X className="size-6" /> : <Plus className="size-6" strokeWidth={3} />}
        </motion.span>
      </button>
    </>
  );
};
