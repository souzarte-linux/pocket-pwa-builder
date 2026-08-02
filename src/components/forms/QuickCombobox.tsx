import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/forms/Form';
import { toast } from 'sonner';

export interface OptionItem {
  id?: string;
  name: string;
}

interface QuickComboboxProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: (OptionItem | string)[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  addNewTitle?: string;
  onAddNew?: (name: string) => Promise<void> | void;
  storageKey?: string;
  className?: string;
}

export const QuickCombobox: React.FC<QuickComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum item encontrado.',
  addNewTitle = 'Cadastrar Novo',
  onAddNew,
  storageKey,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const formattedOptions: OptionItem[] = options.map((opt) =>
    typeof opt === 'string' ? { name: opt } : opt
  );

  // Load initial value from storage if empty
  useEffect(() => {
    if (!value && storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored && formattedOptions.some((o) => o.name === stored)) {
        onChange(stored);
      }
    }
  }, []);

  const handleSelect = (valName: string) => {
    onChange(valName);
    if (storageKey) {
      localStorage.setItem(storageKey, valName);
    }
    setOpen(false);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      if (onAddNew) {
        await onAddNew(newName.trim());
      }
      handleSelect(newName.trim());
      setDialogOpen(false);
      setNewName('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className={`flex gap-2 items-center ${className}`}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              className="w-full h-14 px-4 rounded-lg bg-surface-high border-2 border-transparent focus:border-primary outline-none text-foreground flex items-center justify-between transition text-left text-sm font-medium"
            >
              <span className={value ? 'text-foreground font-semibold' : 'text-muted-foreground/70'}>
                {value || placeholder}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-surface-container border border-border/40 shadow-card rounded-xl overflow-hidden z-50">
            <Command className="bg-transparent text-foreground">
              <CommandInput placeholder={searchPlaceholder} className="h-12 border-b border-border/20 text-sm" />
              <CommandList className="max-h-60 overflow-y-auto p-1">
                <CommandEmpty className="p-3 text-xs text-muted-foreground text-center">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup>
                  {formattedOptions.map((opt) => {
                    const isSelected = value === opt.name;
                    return (
                      <CommandItem
                        key={opt.id || opt.name}
                        value={opt.name}
                        onSelect={() => handleSelect(opt.name)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-surface-high"
                      >
                        <span className={isSelected ? 'font-bold text-primary' : 'text-foreground'}>
                          {opt.name}
                        </span>
                        {isSelected && <Check className="size-4 text-primary shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {onAddNew && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="size-14 shrink-0 grid place-items-center rounded-lg bg-surface-high text-primary border-2 border-transparent hover:border-primary/50 transition active:scale-95"
            title={addNewTitle}
            aria-label={addNewTitle}
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>

      {onAddNew && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-surface-container border border-border/40 sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="display text-lg text-primary uppercase">{addNewTitle}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateNew} className="space-y-4 py-2">
              <div>
                <label className="block label-up text-xs text-muted-foreground mb-2">Nome</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Digite o nome..."
                  autoFocus
                  required
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="h-12 px-4 rounded-lg bg-surface-high font-bold text-sm text-muted-foreground hover:bg-surface-highest transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={adding || !newName.trim()}
                  className="h-12 px-6 rounded-lg bg-primary text-primary-foreground font-extrabold text-sm uppercase shadow-fab hover:opacity-90 transition disabled:opacity-50"
                >
                  {adding ? 'SALVANDO...' : 'CADASTRAR'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
