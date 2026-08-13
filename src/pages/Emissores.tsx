import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  CreditCard,
  Check,
  Save,
  Search,
  Calendar,
  Layers,
  Loader2
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCardBrandOperators } from '@/hooks/queries/useCardBrandOperators';
import { useCardBrandOperatorMutations } from '@/hooks/mutations/useCardBrandOperatorMutations';
import { toast } from 'sonner';

export interface CardIssuerItem {
  id: string;
  name: string;
  card_due_day?: number | null;
  active: boolean;
  brands: string[];
}

const ALL_AVAILABLE_BRANDS = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Diners Club',
  'Alelo',
  'Ticket',
  'VR Benefícios',
];

const DEFAULT_ISSUERS: Omit<CardIssuerItem, 'brands'>[] = [
  { id: 'iss-1', name: 'Mercado Pago', card_due_day: 10, active: true },
  { id: 'iss-2', name: 'Iti (Itaú)', card_due_day: 5, active: true },
  { id: 'iss-3', name: 'Nubank', card_due_day: 15, active: true },
  { id: 'iss-4', name: 'Banco Inter', card_due_day: 10, active: true },
  { id: 'iss-5', name: 'Caixa Econômica', card_due_day: 20, active: true },
  { id: 'iss-6', name: 'Bradesco', card_due_day: 10, active: true },
  { id: 'iss-7', name: 'Itaú Unibanco', card_due_day: 12, active: true },
  { id: 'iss-8', name: 'Banco do Brasil', card_due_day: 15, active: true },
  { id: 'iss-9', name: 'Santander', card_due_day: 8, active: true },
  { id: 'iss-10', name: 'C6 Bank', card_due_day: 10, active: true },
];

export const Emissores = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: relations = [], isLoading: isRelLoading } = useCardBrandOperators(user?.id);
  const { setOperatorBrands } = useCardBrandOperatorMutations(user?.id);

  const [dbOperators, setDbOperators] = useState<{ id: string; name: string; card_due_day?: number | null }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modais de Criação e Edição
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [dueDay, setDueDay] = useState<string>('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(['Visa', 'Mastercard']);

  const [editingItem, setEditingItem] = useState<CardIssuerItem | null>(null);
  const [editingBrands, setEditingBrands] = useState<string[]>([]);

  // Carregar emissores do Supabase table card_operators
  const fetchIssuers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_operators')
        .select('*')
        .order('name');

      if (!error && data) {
        setDbOperators(data);
      }
    } catch (err) {
      console.error('Erro ao carregar emissores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuers();
  }, []);

  // Mescla operadoras do banco com as marcas/bandeiras configuradas em card_brand_operators
  const issuers: CardIssuerItem[] = useMemo(() => {
    const dbNamesLower = new Set(dbOperators.map((m) => m.name.toLowerCase()));

    const mappedDb: CardIssuerItem[] = dbOperators.map((op) => {
      const opRelations = relations.filter((r) => r.operator_id === op.id);
      const bNames = opRelations.map((r) => r.brand_name);
      return {
        id: op.id,
        name: op.name,
        card_due_day: op.card_due_day ?? null,
        active: true,
        brands: bNames.length > 0 ? bNames : ['Visa', 'Mastercard'],
      };
    });

    const remainingDefaults: CardIssuerItem[] = DEFAULT_ISSUERS.filter(
      (d) => !dbNamesLower.has(d.name.toLowerCase())
    ).map((d) => ({
      ...d,
      brands: ['Visa', 'Mastercard'],
    }));

    return [...mappedDb, ...remainingDefaults].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [dbOperators, relations]);

  // Cadastrar Novo Emissor no Banco de Dados (card_operators + card_brand_operators)
  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Informe o nome da instituição emissora.');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    const dueDayNum = Number(dueDay) > 0 && Number(dueDay) <= 31 ? Number(dueDay) : null;

    try {
      const { data, error } = await supabase
        .from('card_operators')
        .insert({
          user_id: user.id,
          name: cleanName,
          card_due_day: dueDayNum,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await setOperatorBrands({
          operatorId: data.id,
          brandNames: selectedBrands,
        });
      }

      await fetchIssuers();
      setShowAddModal(false);
      setName('');
      setDueDay('');
      setSelectedBrands(['Visa', 'Mastercard']);
      toast.success(`Emissor "${cleanName}" cadastrado com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar';
      toast.error(msg);
    }
  };

  // Editar Emissor
  const handleEditIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    const cleanName = editingItem.name.trim();
    if (!cleanName) {
      toast.error('Informe o nome do emissor.');
      return;
    }

    const dueDayNum =
      editingItem.card_due_day && Number(editingItem.card_due_day) > 0
        ? Number(editingItem.card_due_day)
        : null;

    try {
      let targetId = editingItem.id;

      if (editingItem.id.startsWith('iss-')) {
        // Insere se era apenas default
        const { data, error } = await supabase
          .from('card_operators')
          .insert({
            user_id: user.id,
            name: cleanName,
            card_due_day: dueDayNum,
          } as any)
          .select()
          .single();

        if (!error && data) {
          targetId = data.id;
        }
      } else {
        await supabase
          .from('card_operators')
          .update({
            name: cleanName,
            card_due_day: dueDayNum,
          } as any)
          .eq('id', editingItem.id);
      }

      await setOperatorBrands({
        operatorId: targetId,
        brandNames: editingBrands,
      });

      await fetchIssuers();
      setEditingItem(null);
      toast.success('Emissor de cartão atualizado com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(msg);
    }
  };

  // Remover Emissor
  const handleDeleteIssuer = async (id: string, issuerName: string) => {
    if (!confirm(`Deseja remover o emissor "${issuerName}"?`)) return;

    try {
      if (user && !id.startsWith('iss-')) {
        await supabase.from('card_operators').delete().eq('id', id);
      }
      await fetchIssuers();
      toast.success('Emissor removido.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover';
      toast.error(msg);
    }
  };

  const toggleBrandInForm = (brandName: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingBrands((prev) =>
        prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
      );
    } else {
      setSelectedBrands((prev) =>
        prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
      );
    }
  };

  const filteredIssuers = issuers.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="EMISSORES DE CARTÃO" subtitle="Bancos e Operadoras Financeiras Cadastradas" back />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <Building2 className="size-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Instituições Emissoras</h2>
              <p className="text-xs text-[#ab8a7d] font-medium">
                Gerencie bancos, operadoras e as bandeiras que cada instituição oferece aos seus cartões.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedBrands(['Visa', 'Mastercard']);
              setShowAddModal(true);
            }}
            className="size-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
            title="Cadastrar Novo Emissor"
          >
            <Plus className="size-6 stroke-[3]" />
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#ab8a7d]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do banco ou operadora..."
            className="w-full h-14 pl-12 pr-4 bg-[#1c1b1b] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
          />
        </div>

        {/* Lista de Emissores */}
        <div className="space-y-3">
          {loading || isRelLoading ? (
            <div className="text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 flex items-center justify-center gap-2">
              <Loader2 className="size-5 text-[#ff5f00] animate-spin" />
              <span className="text-xs font-semibold">Carregando emissores...</span>
            </div>
          ) : filteredIssuers.length === 0 ? (
            <div className="text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800">
              <p className="text-sm font-semibold">Nenhum emissor encontrado.</p>
            </div>
          ) : (
            filteredIssuers.map((item) => (
              <div
                key={item.id}
                className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-stone-800 hover:border-[#ff5f00]/40 transition flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-[#201f1f] text-[#ff5f00] rounded-2xl shrink-0 border border-stone-800">
                    <Building2 className="size-6" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-extrabold text-base text-white truncate">{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#ab8a7d]">
                      {item.card_due_day ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#201f1f] text-[#ffb599] font-bold text-[10px]">
                          <Calendar className="size-3" /> Venc. Dia {item.card_due_day}
                        </span>
                      ) : null}
                    </div>

                    {/* Badge de Bandeiras Suportadas */}
                    {item.brands && item.brands.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.brands.map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-stone-800 text-stone-300 font-extrabold text-[10px]"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setEditingBrands(item.brands);
                    }}
                    className="p-2.5 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                    title="Editar Emissor e Bandeiras"
                  >
                    <Pencil className="size-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteIssuer(item.id, item.name)}
                    className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                    title="Remover Emissor"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal Novo Emissor */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
                <Building2 className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Novo Emissor de Cartão</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre um novo banco ou instituição financeira.</p>
              </div>
            </div>

            <form onSubmit={handleAddIssuer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Instituição</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Banco Neon / PicPay"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Dia Padrão de Vencimento da Fatura (Opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ex: 10 (dia do mês)"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-2">
                  Bandeiras Suportadas por esta Instituição
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_AVAILABLE_BRANDS.map((b) => {
                    const isSelected = selectedBrands.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBrandInForm(b, false)}
                        className={`p-3 rounded-2xl text-xs font-extrabold text-left transition border flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                            : 'bg-[#201f1f] text-[#e5e2e1] border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <span>{b}</span>
                        {isSelected && <Check className="size-4 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
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

      {/* Modal Editar Emissor */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                <Pencil className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Editar Emissor</h3>
                <p className="text-xs text-[#ab8a7d]">Altere o nome, dia de vencimento e bandeiras suportadas.</p>
              </div>
            </div>

            <form onSubmit={handleEditIssuer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome do Emissor</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Dia Padrão de Vencimento da Fatura
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editingItem.card_due_day || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      card_due_day: Number(e.target.value) || null,
                    })
                  }
                  placeholder="Ex: 10"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-2">
                  Bandeiras Suportadas por este Emissor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_AVAILABLE_BRANDS.map((b) => {
                    const isSelected = editingBrands.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBrandInForm(b, true)}
                        className={`p-3 rounded-2xl text-xs font-extrabold text-left transition border flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                            : 'bg-[#201f1f] text-[#e5e2e1] border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <span>{b}</span>
                        {isSelected && <Check className="size-4 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emissores;
