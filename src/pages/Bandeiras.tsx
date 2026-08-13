import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Building,
  Check,
  Save,
  Power,
  Loader2,
  Building2
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCardBrandOperators } from '@/hooks/queries/useCardBrandOperators';
import { useCardBrandOperatorMutations } from '@/hooks/mutations/useCardBrandOperatorMutations';
import { useCardOperators } from '@/hooks/queries/useAuxiliary';
import { toast } from 'sonner';

interface CardBrandItem {
  id: string;
  name: string;
  type: 'Crédito' | 'Débito' | 'Voucher / Alimentação' | 'Múltiplo';
  active: boolean;
}

const DEFAULT_BRANDS: CardBrandItem[] = [
  { id: '1', name: 'Visa', type: 'Múltiplo', active: true },
  { id: '2', name: 'Mastercard', type: 'Múltiplo', active: true },
  { id: '3', name: 'Elo', type: 'Múltiplo', active: true },
  { id: '4', name: 'Hipercard', type: 'Crédito', active: true },
  { id: '5', name: 'American Express', type: 'Crédito', active: true },
  { id: '6', name: 'Alelo', type: 'Voucher / Alimentação', active: true },
  { id: '7', name: 'Ticket', type: 'Voucher / Alimentação', active: true },
  { id: '8', name: 'VR Benefícios', type: 'Voucher / Alimentação', active: true },
  { id: '9', name: 'Sodexo / Pluxee', type: 'Voucher / Alimentação', active: false },
  { id: '10', name: 'Diners Club', type: 'Crédito', active: true },
];

export const Bandeiras = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: relations = [], isLoading: isRelLoading } = useCardBrandOperators(user?.id);
  const { data: operators = [], isLoading: isOpsLoading } = useCardOperators(user?.id);
  const { addBrandToOperator, removeBrandFromOperator } = useCardBrandOperatorMutations(user?.id);

  const [brands, setBrands] = useState<CardBrandItem[]>(DEFAULT_BRANDS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CardBrandItem['type']>('Crédito');

  // Modal para associar/gerenciar emissores da bandeira
  const [editingBrand, setEditingBrand] = useState<CardBrandItem | null>(null);

  // Mapeia para cada bandeira quais emissores a suportam
  const brandOperatorsMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    relations.forEach((r) => {
      const bKey = r.brand_name.toLowerCase();
      const opName = r.card_operators?.name;
      if (opName) {
        if (!map[bKey]) map[bKey] = [];
        if (!map[bKey].includes(opName)) map[bKey].push(opName);
      }
    });

    return map;
  }, [relations]);

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Informe o nome da bandeira de cartão.');
      return;
    }

    if (brands.some((b) => b.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error('Esta bandeira já está cadastrada.');
      return;
    }

    const newBrand: CardBrandItem = {
      id: `b-${Date.now()}`,
      name: cleanName,
      type,
      active: true,
    };

    setBrands((prev) => [...prev, newBrand]);
    setShowAddModal(false);
    setName('');
    toast.success(`Bandeira "${cleanName}" adicionada com sucesso!`);
  };

  const toggleBrandIssuerRelation = async (operatorId: string, brandName: string) => {
    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    const existingRel = relations.find(
      (r) => r.operator_id === operatorId && r.brand_name.toLowerCase() === brandName.toLowerCase()
    );

    try {
      if (existingRel) {
        await removeBrandFromOperator({ operatorId, brandName });
        toast.info(`Associação removida.`);
      } else {
        await addBrandToOperator({
          user_id: user.id,
          operator_id: operatorId,
          brand_name: brandName,
        });
        toast.success(`Associação adicionada.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar associação';
      toast.error(msg);
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="BANDEIRAS DE CARTÃO" subtitle="Bandeiras e Administradoras Suportadas" back />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <CreditCard className="size-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Bandeiras Suportadas</h2>
              <p className="text-xs text-[#ab8a7d] font-medium">
                Visualize as instituições emissoras associadas a cada bandeira de cartão.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="size-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
            title="Cadastrar Nova Bandeira"
          >
            <Plus className="size-6 stroke-[3]" />
          </button>
        </div>

        {/* Lista de Bandeiras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isRelLoading || isOpsLoading ? (
            <div className="col-span-2 text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 flex items-center justify-center gap-2">
              <Loader2 className="size-5 text-[#ff5f00] animate-spin" />
              <span className="text-xs font-semibold">Carregando bandeiras e associações...</span>
            </div>
          ) : (
            brands.map((b) => {
              const matchedIssuers = brandOperatorsMap[b.name.toLowerCase()] || [];

              return (
                <div
                  key={b.id}
                  className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-stone-800 hover:border-[#ff5f00]/40 transition space-y-3 shadow-md relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#201f1f] text-[#ff5f00] rounded-2xl shrink-0 border border-stone-800">
                        <CreditCard className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-white">{b.name}</h3>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#201f1f] text-[#ffb599] font-bold text-[10px] uppercase mt-0.5">
                          {b.type}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingBrand(b)}
                      className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                      title="Gerenciar Emissores para esta Bandeira"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>

                  {/* Emissores associados */}
                  <div className="pt-2 border-t border-stone-800/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#ab8a7d] uppercase">
                      <Building2 className="size-3 text-[#ff5f00]" />
                      Emissores Vinculados ({matchedIssuers.length})
                    </div>

                    {matchedIssuers.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">Disponível para todas as instituições</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {matchedIssuers.map((iss) => (
                          <span
                            key={iss}
                            className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-stone-800 text-stone-200 font-bold text-[10px]"
                          >
                            {iss}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal Nova Bandeira */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
                <CreditCard className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Nova Bandeira</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre uma nova bandeira de cartão.</p>
              </div>
            </div>

            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Bandeira</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: JCB / Discover"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Tipo de Operação</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CardBrandItem['type'])}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                >
                  <option value="Crédito">Crédito</option>
                  <option value="Débito">Débito</option>
                  <option value="Múltiplo">Múltiplo</option>
                  <option value="Voucher / Alimentação">Voucher / Alimentação</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Emissores da Bandeira */}
      {editingBrand && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingBrand(null)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                <Building2 className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">
                  Emissores da Bandeira "{editingBrand.name}"
                </h3>
                <p className="text-xs text-[#ab8a7d]">Marque quais instituições suportam a bandeira {editingBrand.name}.</p>
              </div>
            </div>

            <div className="space-y-3">
              {operators.length === 0 ? (
                <p className="text-xs text-[#ab8a7d] text-center py-4">Nenhuma instituição emissora cadastrada.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {operators.map((op) => {
                    const isLinked = relations.some(
                      (r) => r.operator_id === op.id && r.brand_name.toLowerCase() === editingBrand.name.toLowerCase()
                    );

                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => toggleBrandIssuerRelation(op.id, editingBrand.name)}
                        className={`p-3.5 rounded-2xl text-xs font-extrabold text-left transition border flex items-center justify-between ${
                          isLinked
                            ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                            : 'bg-[#201f1f] text-[#e5e2e1] border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <span className="truncate">{op.name}</span>
                        {isLinked && <Check className="size-4 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                className="w-full h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bandeiras;
