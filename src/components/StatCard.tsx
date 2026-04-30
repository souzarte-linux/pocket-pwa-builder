import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: ReactNode;
  trend?: string;
  trendPositive?: boolean;
  progress?: number; // 0-100
  highlight?: boolean;
  right?: ReactNode;
  hint?: string;
}

export const StatCard = ({
  label,
  value,
  trend,
  trendPositive = true,
  progress,
  highlight,
  right,
  hint,
}: Props) => (
  <div
    className={cn(
      'rounded-2xl p-4 shadow-card border bg-surface',
      highlight ? 'border-primary' : 'border-border/40'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="label-up text-xs text-muted-foreground">{label}</span>
      {right}
    </div>
    <div className="mt-1.5 flex items-end gap-2">
      <div className={cn('display text-3xl', highlight ? 'text-foreground' : 'text-primary')}>
        {value}
      </div>
      {trend && (
        <span
          className={cn(
            'mb-1 text-xs font-bold',
            trendPositive ? 'text-success' : 'text-destructive'
          )}
        >
          {trendPositive ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
    {typeof progress === 'number' && (
      <div className="mt-3 h-2 rounded-full bg-surface-bright overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
    {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
  </div>
);
