import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, Input, SegButton } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/forms/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export interface CardDetails {
  cardBrand: string;
  cardIssuer: string;
  cardOperator?: string; // Suporte a retrocompatibilidade
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

const DEFAULT_ISSUERS = ['Mercado Pago', 'Iti', 'Nubank', 'Inter', 'Caixa'];

export const CardPaymentDialog: React.FC<CardPaymentDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  initialData,
}) => {
  const [cardBrand, setCardBrand] = useState(initialData?.cardBrand || '');
  const [cardIssuer, setCardIssuer] = useState(initialData?.cardIssuer || initialData?.cardOperator || '');
  const [isInstallment, setIsInstallment] = useState(initialData?.isInstallment || false);
  const [installmentTotal, setInstallmentTotal] = useState(initialData?.installmentTotal || 2);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(
    initialData?.firstInstallmentDate || new Date().toISOString().slice(0, 10)
  );

  const [issuers, setIssuers] = useState<string[]>(DEFAULT_ISSUERS);

  // Load issuers from Supabase and defaults
  useEffect(() => {
    if (!open) return;
    const fetchIssuers = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data, error } = await supabase
        .from('card_operators')
        .select('name')
        .order('name');

      if (!error && data) {
        const dbNames = data.map((d) => d.name);
        const combined = Array.from(new Set([...DEFAULT_ISSUERS, ...dbNames]));
        setIssuers(combined);
      }
    };

    fetchIssuers();

    // Auto load last saved choices if empty, migrando 'last_card_operator' se houver
    if (!cardBrand) {
      const lastBrand = localStorage.getItem('last_card_brand');
      if (lastBrand) setCardBrand(lastBrand);
      else setCardBrand(COMMON_CARD_BRANDS[0]);
    }

    if (!cardIssuer) {
      const lastIssuer = localStorage.getItem('last_card_issuer') || localStorage.getItem('last_card_operator');
      if (lastIssuer) setCardIssuer(lastIssuer);
    }
  }, [open]);

  const handleAddNewIssuer = async (name: string) => {
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
      console.error(error);
    }
    setIssuers((prev) => Array.from(new Set([...prev, name])));
    toast.success('Emissor cadastrado!');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardBrand) {
      toast.error('Selecione a bandeira do cartão');
      return;
    }
    if (!cardIssuer) {
      toast.error('Selecione o emissor do cartão');
      return;
    }

    // Persist last selections (gravando last_card_issuer e mantendo last_card_operator para legado)
    localStorage.setItem('last_card_issuer', cardIssuer);
    localStorage.setItem('last_card_operator', cardIssuer);

    onConfirm({
      cardBrand,
      cardIssuer,
      cardOperator: cardIssuer,
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

          {/* Emissor */}
          <Field label="Emissor / Instituição">
            <QuickCombobox
              value={cardIssuer}
              onChange={setCardIssuer}
              options={issuers}
              placeholder="Selecione ou busque o emissor..."
              searchPlaceholder="Buscar emissor (Mercado Pago, Iti...)..."
              emptyMessage="Emissor não encontrado."
              addNewTitle="Cadastrar Novo Emissor"
              onAddNew={handleAddNewIssuer}
              storageKey="last_card_issuer"
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
