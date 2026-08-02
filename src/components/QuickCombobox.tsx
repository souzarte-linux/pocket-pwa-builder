import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CompanyDialog } from '@/components/forms/CompanyDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SupportedTable = 'card_operators' | 'companies';

interface Props {
  /** Supabase table holding the options (must have `name` + `user_id`) */
  table?: SupportedTable;
  /** Static options (used when no table is provided, e.g. card brands) */
  staticOptions?: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** localStorage key used to remember the last choice */
  rememberKey?: string;
  /** Allows creating new entries (only when a table is provided) */
  allowCreate?: boolean;
}

export const QuickCombobox = ({
  table,
  staticOptions,
  value,
  onChange,
  placeholder = 'Selecione',
  rememberKey,
  allowCreate = true,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(staticOptions ?? []);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!table) return;
    const { data } = await supabase.from(table).select('name').order('name');
    setOptions((data ?? []).map((d: any) => d.name));
  };

  useEffect(() => {
    if (table) load();
    else setOptions(staticOptions ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const pick = (v: string) => {
    onChange(v);
    if (rememberKey) localStorage.setItem(rememberKey, v);
    setOpen(false);
    setSearch('');
  };

  const create = async (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    if (table === 'companies') {
      setCompanyDialogOpen(true);
      return;
    }

    if (!table) {
      setOptions((o) => (o.includes(clean) ? o : [...o, clean]));
      pick(clean);
      return;
    }
    setCreating(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setCreating(false);
      return;
    }
    const { error } = await supabase.from(table).insert({ user_id: u.user.id, name: clean } as any);
    setCreating(false);
    if (error && !error.message.includes('duplicate')) {
      console.error(error);
      toast.error('Não foi possível cadastrar. Tente novamente.');
      return;
    }
    await load();
    pick(clean);
  };

  const handleCompanyCreated = async (createdName: string) => {
    await load();
    pick(createdName);
  };

  const handlePlusClick = () => {
    if (table === 'companies') {
      setCompanyDialogOpen(true);
    } else {
      const name = window.prompt('Nome');
      if (name) create(name);
    }
  };

  const exact = options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-1 h-14 px-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-left flex items-center justify-between gap-2"
            >
              <span className={cn('truncate', !value && 'text-muted-foreground/70')}>
                {value || placeholder}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[--radix-popover-trigger-width] bg-surface-high z-50" align="start">
            <Command shouldFilter>
              <CommandInput placeholder="Buscar..." value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty className="p-3 text-sm text-muted-foreground">
                  Nenhum resultado.
                </CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                      <Check className={cn('mr-2 size-4', value === o ? 'opacity-100' : 'opacity-0')} />
                      {o}
                    </CommandItem>
                  ))}
                  {allowCreate && search.trim() && !exact && (
                    <CommandItem value={`__create__${search}`} onSelect={() => create(search)}>
                      <Plus className="mr-2 size-4" />
                      {creating ? 'Salvando...' : `Cadastrar "${search.trim()}"`}
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {allowCreate && (
          <button
            type="button"
            onClick={handlePlusClick}
            className="size-14 shrink-0 grid place-items-center rounded-lg bg-surface-high text-primary border border-border/40"
            aria-label="Cadastrar novo"
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>

      {table === 'companies' && (
        <CompanyDialog
          open={companyDialogOpen}
          onOpenChange={setCompanyDialogOpen}
          onCompanyCreated={handleCompanyCreated}
        />
      )}
    </>
  );
};
