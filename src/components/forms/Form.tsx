import { ReactNode } from 'react';

export const FormShell = ({ children, footer }: { children: ReactNode; footer: ReactNode }) => (
  <div className="space-y-5 pb-2">
    {children}
    <div className="pt-2 sticky bottom-24">{footer}</div>
  </div>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="block label-up text-xs text-muted-foreground mb-2">{label}</label>
    {children}
  </div>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      'w-full h-14 px-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-foreground placeholder:text-muted-foreground/70 transition ' +
      (props.className ?? '')
    }
  />
);

export const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={
      'w-full min-h-[88px] p-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-foreground placeholder:text-muted-foreground/70 transition ' +
      (props.className ?? '')
    }
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      'w-full h-14 px-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-foreground transition appearance-none ' +
      (props.className ?? '')
    }
  />
);

export const SegButton = ({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'min-h-[56px] px-4 rounded-lg font-bold text-sm transition ' +
      (active
        ? 'bg-primary/15 text-primary border-2 border-primary'
        : 'bg-surface-high text-foreground border-2 border-transparent') +
      ' ' +
      (className ?? '')
    }
  >
    {children}
  </button>
);

export const SubmitButton = ({
  children,
  loading,
}: {
  children: ReactNode;
  loading?: boolean;
}) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full min-h-[64px] rounded-lg bg-primary text-primary-foreground font-extrabold text-lg shadow-fab active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2 uppercase"
  >
    {loading ? 'SALVANDO…' : children}
  </button>
);
