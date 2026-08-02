import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, Input, SegButton } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/forms/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export interface CardDetails {
  cardBrand: string;
  cardOperator: string;
  isInstallment: boolean;
  installmentTotal: number;
  firstInstallmentDate: string;
}

interface CardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: CardDetails) => void;
  initialData?: Partial<CardDetails>;
}

const COMMON_CARD_BRANDS = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Alelo',
  'Sodexo',
  'Ticket',
  'VR',
  'Outra',
];

const DEFAULT_OPERATORS = ['Mercado Pago', 'Iti', 'Nubank', 'Inter', 'Caixa'];

export const CardPaymentDialog: React.FC<CardPaymentDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  initialData,
}) => {
  const [cardBrand, setCardBrand] = useState(initialData?.cardBrand || '');
  const [cardOperator, setCardOperator] = useState(initialData?.cardOperator || '');
  const [isInstallment, setIsInstallment] = useState(initialData?.isInstallment || false);
  const [installmentTotal, setInstallmentTotal] = useState(initialData?.installmentTotal || 2);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(
    initialData?.firstInstallmentDate || new Date().toISOString().slice(0, 10)
  );

  const [operators, setOperators] = useState<string[]>(DEFAULT_OPERATORS);

  // Load operators from Supabase and defaults
  useEffect(() => {
    if (!open) return;
    const fetchOperators = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data, error } = await supabase
        .from('card_operators')
        .select('name')
        .order('name');

      if (!error && data) {
        const dbNames = data.map((d) => d.name);
        const combined = Array.from(new Set([...DEFAULT_OPERATORS, ...dbNames]));
        setOperators(combined);
      }
    };

    fetchOperators();

    // Auto load last saved choices if empty
    if (!cardBrand) {
      const lastBrand = localStorage.getItem('last_card_brand');
      if (lastBrand) setCardBrand(lastBrand);
      else setCardBrand(COMMON_CARD_BRANDS[0]);
    }

    if (!cardOperator) {
      const lastOp = localStorage.getItem('last_card_operator');
      if (lastOp) setCardOperator(lastOp);
    }
  }, [open]);

  const handleAddNewOperator = async (name: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const { error } = await supabase.from('card_operators').insert({
      user_id: u.user.id,
      name,
    });

    if (error) {
      // If table missing or error, still add to local list
      console.error(error);
    }
    setOperators((prev) => Array.from(new Set([...prev, name])));
    toast.success('Operadora cadastrada!');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardBrand) {
      toast.error('Selecione a bandeira do cartão');
      return;
    }
    if (!cardOperator) {
      toast.error('Selecione a operadora do cartão');
      return;
    }

    // Persist last selections
    localStorage.setItem('last_card_brand', cardBrand);
    localStorage.setItem('last_card_operator', cardOperator);

    onConfirm({
      cardBrand,
      cardOperator,
      isInstallment,
      installmentTotal: isInstallment ? Math.max(2, installmentTotal) : 1,
      firstInstallmentDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-container border border-border/40 sm:max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="display text-xl text-primary flex items-center gap-2 uppercase">
            <CreditCard className="size-6 text-primary" />
            Detalhes do Pagamento em Cartão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Bandeira */}
          <Field label="Bandeira do Cartão">
            <QuickCombobox
              value={cardBrand}
              onChange={setCardBrand}
              options={COMMON_CARD_BRANDS}
              placeholder="Selecione a bandeira..."
              searchPlaceholder="Buscar bandeira..."
              storageKey="last_card_brand"
            />
          </Field>

          {/* Operadora */}
          <Field label="Operadora / Instituição">
            <QuickCombobox
              value={cardOperator}
              onChange={setCardOperator}
              options={operators}
              placeholder="Selecione ou busque a operadora..."
              searchPlaceholder="Buscar operadora (Mercado Pago, Iti...)..."
              emptyMessage="Operadora não encontrada."
              addNewTitle="Cadastrar Nova Operadora"
              onAddNew={handleAddNewOperator}
              storageKey="last_card_operator"
            />
          </Field>

          {/* Modalidade */}
          <Field label="Modalidade">
            <div className="grid grid-cols-2 gap-2">
              <SegButton active={!isInstallment} onClick={() => setIsInstallment(false)}>
                À VISTA
              </SegButton>
              <SegButton active={isInstallment} onClick={() => setIsInstallment(true)}>
                A PRAZO (PARCELADO)
              </SegButton>
            </div>
          </Field>

          {/* Parcelas */}
          {isInstallment && (
            <div className="space-y-4 pt-1 border-t border-border/20">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qtd. de Parcelas">
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    value={installmentTotal}
                    onChange={(e) => setInstallmentTotal(Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label="1ª Parcela (Mês/Ano)">
                  <div className="relative">
                    <Input
                      type="date"
                      value={firstInstallmentDate}
                      onChange={(e) => setFirstInstallmentDate(e.target.value)}
                      required
                    />
                  </div>
                </Field>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                * Serão lançadas <strong>{installmentTotal} despesas</strong> nos meses consecutivos na mesma data do mês.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 px-4 rounded-lg bg-surface-high font-bold text-sm text-muted-foreground hover:bg-surface-highest transition"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="h-12 px-6 rounded-lg bg-primary text-primary-foreground font-extrabold text-sm uppercase shadow-fab hover:opacity-90 transition"
            >
              CONFIRMAR CARTÃO
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
