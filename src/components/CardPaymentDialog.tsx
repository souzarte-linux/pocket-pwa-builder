import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, SegButton } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';

export interface CardDetails {
  brand: string;
  operator: string;
  installments: number;
  firstMonth: string; // yyyy-MM
  cardDueDay?: number | null; // 1-31
}

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Diners Club'];

export const CardPaymentDialog = ({
  open,
  onOpenChange,
  value,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: CardDetails | null;
  onConfirm: (d: CardDetails) => void;
}) => {
  const [brand, setBrand] = useState('');
  const [operator, setOperator] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstMonth, setFirstMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cardDueDay, setCardDueDay] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setBrand(value?.brand || localStorage.getItem('lastCardBrand') || '');
    setOperator(value?.operator || localStorage.getItem('lastCardOperator') || '');
    setInstallments(value?.installments ?? 1);
    setFirstMonth(value?.firstMonth ?? new Date().toISOString().slice(0, 7));
    setCardDueDay(value?.cardDueDay ? String(value.cardDueDay) : localStorage.getItem('lastCardDueDay') || '10');
  }, [open, value]);

  // When operator is selected, try fetching default card_due_day from Supabase card_operators
  useEffect(() => {
    if (!operator) return;
    (async () => {
      const { data } = await supabase
        .from('card_operators')
        .select('card_due_day')
        .eq('name', operator)
        .maybeSingle();

      if (data && (data as any).card_due_day) {
        setCardDueDay(String((data as any).card_due_day));
      }
    })();
  }, [operator]);

  const aPrazo = installments > 1;

  const handleConfirm = async () => {
    if (brand) localStorage.setItem('lastCardBrand', brand);
    if (operator) localStorage.setItem('lastCardOperator', operator);
    const dueDayNum = Number(cardDueDay) > 0 && Number(cardDueDay) <= 31 ? Number(cardDueDay) : null;
    if (dueDayNum) localStorage.setItem('lastCardDueDay', String(dueDayNum));

    // Save default card_due_day to card_operators if operator exists
    if (operator && dueDayNum) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase
          .from('card_operators')
          .update({ card_due_day: dueDayNum } as any)
          .eq('name', operator);
      }
    }

    onConfirm({
      brand,
      operator,
      installments,
      firstMonth,
      cardDueDay: dueDayNum,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle className="display">DADOS DO CARTÃO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Bandeira">
            <QuickCombobox
              staticOptions={BRANDS}
              value={brand}
              onChange={setBrand}
              rememberKey="lastCardBrand"
              placeholder="Selecione a bandeira"
              allowCreate={false}
            />
          </Field>
          <Field label="Operadora">
            <QuickCombobox
              table="card_operators"
              value={operator}
              onChange={setOperator}
              rememberKey="lastCardOperator"
              placeholder="Selecione a operadora"
            />
          </Field>
          <Field label="Pagamento">
            <div className="grid grid-cols-2 gap-2">
              <SegButton active={!aPrazo} onClick={() => setInstallments(1)}>
                À VISTA
              </SegButton>
              <SegButton active={aPrazo} onClick={() => setInstallments(installments > 1 ? installments : 2)}>
                A PRAZO
              </SegButton>
            </div>
          </Field>
          {aPrazo && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Parcelas">
                  <Input
                    type="number"
                    min={2}
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(2, Number(e.target.value) || 2))}
                  />
                </Field>
                <Field label="1ª parcela (mês)">
                  <Input type="month" value={firstMonth} onChange={(e) => setFirstMonth(e.target.value)} />
                </Field>
              </div>
              <Field label="Venc. Fatura Cartão (Dia do mês)">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ex: 10"
                  value={cardDueDay}
                  onChange={(e) => setCardDueDay(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-extrabold uppercase"
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
