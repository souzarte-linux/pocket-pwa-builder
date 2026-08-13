import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, SegButton } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCardBrandOperators } from '@/hooks/queries/useCardBrandOperators';
import { useCardOperators } from '@/hooks/queries/useAuxiliary';

export interface CardDetails {
  brand: string;
  issuer: string;
  operator?: string;
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
  const { user } = useAuth();
  const { data: relations = [] } = useCardBrandOperators(user?.id);
  const { data: allOperators = [] } = useCardOperators(user?.id);

  const [brand, setBrand] = useState('');
  const [issuer, setIssuer] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstMonth, setFirstMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cardDueDay, setCardDueDay] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setBrand(value?.brand || localStorage.getItem('lastCardBrand') || '');
    setIssuer(value?.issuer || value?.operator || localStorage.getItem('lastCardIssuer') || localStorage.getItem('lastCardOperator') || '');
    setInstallments(value?.installments ?? 1);
    setFirstMonth(value?.firstMonth ?? new Date().toISOString().slice(0, 7));
    setCardDueDay(value?.cardDueDay ? String(value.cardDueDay) : localStorage.getItem('lastCardDueDay') || '10');
  }, [open, value]);

  // Lista de emissores filtrada pela bandeira selecionada
  const availableIssuers = useMemo(() => {
    const allIssuerNames = allOperators.map((o) => o.name);
    if (!brand) {
      return allIssuerNames.length > 0 ? allIssuerNames : undefined;
    }

    const matchingRelations = relations.filter(
      (r) => r.brand_name.toLowerCase() === brand.toLowerCase()
    );

    if (matchingRelations.length === 0) {
      return allIssuerNames.length > 0 ? allIssuerNames : undefined;
    }

    const validNames = matchingRelations
      .map((r) => r.card_operators?.name)
      .filter((n): n is string => Boolean(n));

    return validNames.length > 0 ? validNames : allIssuerNames;
  }, [brand, relations, allOperators]);

  // Lista de bandeiras filtrada pelo emissor selecionado
  const availableBrands = useMemo(() => {
    if (!issuer) return BRANDS;

    const matchedOperator = allOperators.find(
      (o) => o.name.toLowerCase() === issuer.toLowerCase()
    );

    if (!matchedOperator) return BRANDS;

    const operatorRelations = relations.filter(
      (r) => r.operator_id === matchedOperator.id
    );

    if (operatorRelations.length === 0) return BRANDS;

    const validBrandNames = operatorRelations.map((r) => r.brand_name);
    return Array.from(new Set([...validBrandNames, ...BRANDS]));
  }, [issuer, relations, allOperators]);

  // Handler de alteração da bandeira com revalidação inteligente (limpa apenas o emissor se incompatível)
  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    if (!issuer || !newBrand) return;

    const matchedOperator = allOperators.find(
      (o) => o.name.toLowerCase() === issuer.toLowerCase()
    );

    if (matchedOperator) {
      const operatorRelations = relations.filter(
        (r) => r.operator_id === matchedOperator.id
      );
      if (
        operatorRelations.length > 0 &&
        !operatorRelations.some((r) => r.brand_name.toLowerCase() === newBrand.toLowerCase())
      ) {
        // Emissor atual não suporta a nova bandeira -> limpa apenas o emissor
        setIssuer('');
      }
    }
  };

  // Handler de alteração do emissor com revalidação inteligente (limpa apenas a bandeira se incompatível)
  const handleIssuerChange = (newIssuer: string) => {
    setIssuer(newIssuer);
    if (!brand || !newIssuer) return;

    const matchedOperator = allOperators.find(
      (o) => o.name.toLowerCase() === newIssuer.toLowerCase()
    );

    if (matchedOperator) {
      const operatorRelations = relations.filter(
        (r) => r.operator_id === matchedOperator.id
      );
      if (
        operatorRelations.length > 0 &&
        !operatorRelations.some((r) => r.brand_name.toLowerCase() === brand.toLowerCase())
      ) {
        // Nova emissor não suporta a bandeira atual -> limpa apenas a bandeira
        setBrand('');
      }
    }
  };

  // When issuer is selected, try fetching default card_due_day from Supabase card_operators
  useEffect(() => {
    if (!issuer) return;
    (async () => {
      const { data } = await supabase
        .from('card_operators')
        .select('card_due_day')
        .eq('name', issuer)
        .maybeSingle();

      if (data && data.card_due_day) {
        setCardDueDay(String(data.card_due_day));
      }
    })();
  }, [issuer]);

  const aPrazo = installments > 1;

  const handleConfirm = async () => {
    if (brand) localStorage.setItem('lastCardBrand', brand);
    if (issuer) {
      localStorage.setItem('lastCardIssuer', issuer);
      localStorage.setItem('lastCardOperator', issuer);
    }
    const dueDayNum = Number(cardDueDay) > 0 && Number(cardDueDay) <= 31 ? Number(cardDueDay) : null;
    if (dueDayNum) localStorage.setItem('lastCardDueDay', String(dueDayNum));

    // Save default card_due_day to card_operators if issuer exists
    if (issuer && dueDayNum) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase
          .from('card_operators')
          .update({ card_due_day: dueDayNum } as any)
          .eq('name', issuer);
      }
    }

    onConfirm({
      brand,
      issuer,
      operator: issuer,
      installments,
      firstMonth,
      cardDueDay: dueDayNum,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface font-lexend">
        <DialogHeader>
          <DialogTitle className="display">DADOS DO CARTÃO</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Bandeira">
            <QuickCombobox
              staticOptions={availableBrands}
              value={brand}
              onChange={handleBrandChange}
              rememberKey="lastCardBrand"
              placeholder="Selecione a bandeira"
              allowCreate={false}
            />
          </Field>
          <Field label="Emissor / Operadora">
            <QuickCombobox
              table="card_operators"
              staticOptions={availableIssuers}
              value={issuer}
              onChange={handleIssuerChange}
              rememberKey="lastCardIssuer"
              placeholder="Selecione o emissor"
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
            className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-extrabold uppercase hover:opacity-90 transition active:scale-95"
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
