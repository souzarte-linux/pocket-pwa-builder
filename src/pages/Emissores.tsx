import React, { useEffect, useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CardIssuerItem {
  id: string;
  name: string;
  card_due_day?: number | null;
  active: boolean;
}

const DEFAULT_ISSUERS: CardIssuerItem[] = [
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
  const [issuers, setIssuers] = useState<CardIssuerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modais de Criação e Edição
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [dueDay, setDueDay] = useState<string>('');
  const [editingItem, setEditingItem] = useState<CardIssuerItem | null>(null);

  // Carregar emissores do Supabase table card_operators
  const fetchIssuers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_operators')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        const mapped: CardIssuerItem[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          card_due_day: item.card_due_day ?? null,
          active: true,
        }));

        // Combinar com defaults evitando duplicados
        const dbNamesLower = new Set(mapped.map((m) => m.name.toLowerCase()));
        const remainingDefaults = DEFAULT_ISSUERS.filter(
          (d) => !dbNamesLower.has(d.name.toLowerCase())
        );

        const combined = [...mapped, ...remainingDefaults].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR')
        );
        setIssuers(combined);
      } else {
        setIssuers([...DEFAULT_ISSUERS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      }
    } catch (err) {
      console.error('Erro ao carregar emissores:', err);
      setIssuers([...DEFAULT_ISSUERS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuers();
  }, []);

  // Cadastrar Novo Emissor no Banco de Dados (card_operators)
  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Informe o nome da instituição emissora.');
      return;
    }

    if (issuers.some((i) => i.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error('Este emissor já está cadastrado.');
      return;
    }

    const dueDayNum = Number(dueDay) > 0 && Number(dueDay) <= 31 ? Number(dueDay) : null;
    let createdId = `iss-${Date.now()}`;

    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data, error } = await supabase
        .from('card_operators')
        .insert({
          user_id: u.user.id,
          name: cleanName,
          card_due_day: dueDayNum,
        })
        .select()
        .single();

      if (!error && data) {
        createdId = data.id;
      }
    }

    const newItem: CardIssuerItem = {
      id: createdId,
      name: cleanName,
      card_due_day: dueDayNum,
      active: true,
    };

    setIssuers((prev) =>
      [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );

    // Salvar como escolha padrão
    localStorage.setItem('last_card_issuer', cleanName);
    localStorage.setItem('last_card_operator', cleanName);

    setShowAddModal(false);
    setName('');
    setDueDay('');
    toast.success(`Emissor "${cleanName}" cadastrado com sucesso!`);
  };

  // Editar Emissor
  const handleEditIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const cleanName = editingItem.name.trim();
    if (!cleanName) {
      toast.error('Informe o nome do emissor.');
      return;
    }

    const dueDayNum =
      editingItem.card_due_day && Number(editingItem.card_due_day) > 0
        ? Number(editingItem.card_due_day)
        : null;

    const { data: u } = await supabase.auth.getUser();
    if (u.user && !editingItem.id.startsWith('iss-')) {
      await supabase
        .from('card_operators')
        .update({
          name: cleanName,
          card_due_day: dueDayNum,
        })
        .eq('id', editingItem.id);
    }

    setIssuers((prev) =>
      prev
        .map((item) =>
          item.id === editingItem.id
            ? { ...editingItem, name: cleanName, card_due_day: dueDayNum }
            : item
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );

    setEditingItem(null);
    toast.success('Emissor de cartão atualizado com sucesso!');
  };

  // Remover Emissor
  const handleDeleteIssuer = async (id: string, issuerName: string) => {
    if (!confirm(`Deseja remover o emissor "${issuerName}"?`)) return;

    const { data: u } = await supabase.auth.getUser();
    if (u.user && !id.startsWith('iss-')) {
      await supabase.from('card_operators').delete().eq('id', id);
    }

    setIssuers((prev) => prev.filter((item) => item.id !== id));
    toast.success('Emissor removido.');
  };

  // Alternar Status Ativo
  const toggleStatus = (id: string) => {
    setIssuers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.active;
          toast.info(`Emissor "${item.name}" ${nextState ? 'HABILITADO' : 'DESABILITADO'}`);
          return { ...item, active: nextState };
        }
        return item;
      })
    );
  };

  const filteredIssuers = issuers.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader
        title="EMISSORES DE CARTÃO"
        subtitle="Instituições Emissoras Conectadas aos Lançamentos"
        back
      />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <CreditCard className="size-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Instituições Emissoras</h2>
              <p className="text-xs text-[#ab8a7d] font-medium">
                Bancos e financeiras emissoras dos cartões utilizados nas manutenções e despesas.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="size-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
            title="Cadastrar Novo Emissor"
          >
            <Plus className="size-6 stroke-[3]" />
          </button>
        </div>

        {/* Busca por Emissor */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#ab8a7d]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do banco ou instituição..."
            className="w-full h-14 pl-12 pr-4 bg-[#1c1b1b] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
          />
        </div>

        {/* Lista de Emissores */}
        <div className="space-y-3">
          {filteredIssuers.length === 0 ? (
            <div className="text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800">
              <p className="text-sm font-semibold">Nenhum emissor encontrado.</p>
            </div>
          ) : (
            filteredIssuers.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border-2 transition flex items-center justify-between gap-4 ${
                  item.active
                    ? 'bg-[#1c1b1b] border-stone-800 hover:border-[#ff5f00]/40'
                    : 'bg-[#181717] border-stone-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-[#201f1f] rounded-xl shrink-0 border border-stone-800 text-[#ff5f00]">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white truncate">{item.name}</h3>
                      {item.active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 font-extrabold text-[10px] uppercase border border-emerald-800/40">
                          EM USO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-900 text-stone-500 font-bold text-[10px] uppercase border border-stone-800">
                          INATIVO
                        </span>
                      )}
                    </div>
                    {item.card_due_day && (
                      <p className="text-xs text-[#ab8a7d] mt-0.5 flex items-center gap-1">
                        <Calendar className="size-3 text-[#ff5f00]" />
                        <span>Dia {item.card_due_day} (Vencimento Padrão)</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleStatus(item.id)}
                    className={`p-2 rounded-xl transition ${
                      item.active
                        ? 'text-emerald-400 hover:bg-emerald-950/40'
                        : 'text-stone-500 hover:bg-stone-800'
                    }`}
                    title={item.active ? 'Desabilitar Emissor' : 'Habilitar Emissor'}
                  >
                    <CheckCircle2 className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                    title="Editar Emissor"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIssuer(item.id, item.name)}
                    className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
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

      {/* Modal de Cadastro de Emissor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b1b] border-2 border-stone-800 w-full max-w-md rounded-3xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <CreditCard className="size-5 text-[#ff5f00]" />
                CADASTRAR NOVO EMISSOR
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-[#201f1f]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddIssuer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-[#ab8a7d]">
                  Nome da Instituição Emissora *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mercado Pago, Iti, Itaú, Nubank..."
                  className="w-full h-12 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-[#ab8a7d]">
                  Dia do Vencimento Padrão da Fatura (Opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full h-12 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-12 rounded-xl bg-[#201f1f] font-bold text-stone-400 hover:bg-[#2a2a2a] transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center gap-2 hover:bg-[#ffb599] transition shadow-lg"
                >
                  <Save className="size-4 stroke-[3]" />
                  SALVAR EMISSOR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Emissor */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b1b] border-2 border-stone-800 w-full max-w-md rounded-3xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <Pencil className="size-5 text-[#ff5f00]" />
                EDITAR EMISSOR
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-[#201f1f]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditIssuer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-[#ab8a7d]">
                  Nome da Instituição Emissora
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  className="w-full h-12 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-[#ab8a7d]">
                  Dia do Vencimento Padrão (1 a 31)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editingItem.card_due_day ?? ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      card_due_day: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full h-12 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 h-12 rounded-xl bg-[#201f1f] font-bold text-stone-400 hover:bg-[#2a2a2a] transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center gap-2 hover:bg-[#ffb599] transition shadow-lg"
                >
                  <Save className="size-4 stroke-[3]" />
                  ATUALIZAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
