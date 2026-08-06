import { ReactNode, useState, useMemo, forwardRef } from 'react';
import {
  formatCurrencyMask,
  formatDistanceMask,
  formatPackageMask,
  formatVolumeMask,
  formatPackageTotalMask,
  getCleanUnmaskedValue,
} from '@/lib/format';

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

export interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  maskType: 'currency' | 'distance' | 'package' | 'volume' | 'package_total';
  value: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ maskType, value, onChange, onFocus, onBlur, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [editingText, setEditingText] = useState<string>('');

    const formattedDisplay = useMemo(() => {
      if (maskType === 'currency') return formatCurrencyMask(value);
      if (maskType === 'distance') return formatDistanceMask(value);
      if (maskType === 'package') return formatPackageMask(value);
      if (maskType === 'volume') return formatVolumeMask(value);
      if (maskType === 'package_total') return formatPackageTotalMask(value);
      return String(value ?? '');
    }, [maskType, value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setEditingText(getCleanUnmaskedValue(value, maskType));
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingText(e.target.value);
      if (onChange) onChange(e);
    };

    const displayValue = isFocused ? editingText : formattedDisplay;

    return (
      <input
        {...props}
        ref={ref}
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={
          'w-full h-14 px-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-foreground placeholder:text-muted-foreground/70 transition ' +
          (className ?? '')
        }
      />
    );
  }
);
MaskedInput.displayName = 'MaskedInput';


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
