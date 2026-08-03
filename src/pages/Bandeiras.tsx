import React, { useEffect, useState } from 'react';
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
  Save
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardBrand {
  id: string;
  name: string;
  type: 'Crédito' | 'Débito' | 'Voucher / Alimentação' | 'Múltiplo';
  issuer?: string;
  active: boolean;
}

const DEFAULT_BRANDS: CardBrand[] = [
  { id: '1', name: 'Visa', type: 'Múltiplo', issuer: 'Todas as instituições', active: true },
  { id: '2', name: 'Mastercard', type: 'Múltiplo', issuer: 'Todas as instituições', active: true },
  { id: '3', name: 'Elo', type: 'Múltiplo', issuer: 'Bancos Brasileiros (Bradesco, BB, Caixa)', active: true },
  { id: '4', name: 'Hipercard', type: 'Crédito', issuer: 'Itaú Unibanco', active: true },
  { id: '5', name: 'American Express', type: 'Crédito', issuer: 'Bradesco / Santander', active: true },
  { id: '6', name: 'Alelo', type: 'Voucher / Alimentação', issuer: 'Alelo Benefícios', active: true },
  { id: '7', name: 'Ticket', type: 'Voucher / Alimentação', issuer: 'Ticket Serviços', active: true },
  { id: '8', name: 'VR Benefícios', type: 'Voucher / Alimentação', issuer: 'VR', active: true },
  { id: '9', name: 'Sodexo / Pluxee', type: 'Voucher / Alimentação', issuer: 'Pluxee', active: true },
];

export const Bandeiras = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<CardBrand[]>(DEFAULT_BRANDS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CardBrand['type']>('Crédito');
  const [issuer, setIssuer] = useState('');

  // Edição
  const [editingItem, setEditingItem] = useState<CardBrand | null>(null);

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da bandeira de cartão.');
      return;
    }

    const newBrand: CardBrand = {
      id: `brand-${Date.now()}`,
      name: name.trim(),
      type,
      issuer: issuer.trim() || 'Emissor Geral',
      active: true,
    };

    setBrands((prev) => [newBrand, ...prev]);
    setShowAddModal(false);
    setName('');
    setIssuer('');
    setType('Crédito');
    toast.success(`Bandeira "${newBrand.name}" cadastrada com sucesso!`);
  };

  const handleEditBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setBrands((prev) =>
      prev.map((b) =>
        b.id === editingItem.id
          ? { ...editingItem, name: editingItem.name.trim(), issuer: editingItem.issuer?.trim() }
          : b
      )
    );

    setEditingItem(null);
    toast.success('Bandeira atualizada com sucesso!');
  };

  const handleDeleteBrand = (id: string, brandName: string) => {
    if (!confirm(`Deseja remover a bandeira "${brandName}"?`)) return;
    setBrands((prev) => prev.filter((b) => b.id !== id));
    toast.success('Bandeira removida.');
  };

  const toggleStatus = (id: string) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="BANDEIRAS DE CARTÃO" subtitle="Cartões de Crédito, Débito e Benefícios Cadastrados" />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <CreditCard className="size-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Bandeiras Cadastradas</h2>
              <p className="text-xs text-[#ab8a7d] font-medium">
                Gerencie as bandeiras de cartão de crédito, débito e vale refeição/alimentação.
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

        {/* Lista de Bandeiras em Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brands.map((b) => (
            <div
              key={b.id}
              className={`p-5 rounded-3xl border-2 transition-all space-y-3 relative ${
                b.active
                  ? 'bg-[#1c1b1b] border-stone-800 hover:border-[#ff5f00]/50'
                  : 'bg-[#161515] border-stone-900 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#ff5f00]/15 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                    <CreditCard className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{b.name}</h3>
                    <p className="text-xs text-[#ab8a7d] font-medium">{b.issuer || 'Emissor Geral'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingItem(b)}
                    className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                    title="Editar Bandeira"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(b.id, b.name)}
                    className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                    title="Remover Bandeira"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#201f1f] text-[#ffb599] font-bold border border-stone-800">
                  {b.type}
                </span>

                <button
                  onClick={() => toggleStatus(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold text-[11px] uppercase transition ${
                    b.active
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{b.active ? 'Ativa' : 'Inativa'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Adicionar Bandeira */}
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
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Cadastrar Nova Bandeira</h3>
                <p className="text-xs text-[#ab8a7d]">Informe o nome e categoria da bandeira de cartão.</p>
              </div>
            </div>

            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Bandeira</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sodexo, Caju, Hiper"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Tipo do Cartão</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                >
                  <option value="Crédito">Crédito</option>
                  <option value="Débito">Débito</option>
                  <option value="Voucher / Alimentação">Voucher / Alimentação / Refeição</option>
                  <option value="Múltiplo">Múltiplo (Crédito & Débito)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Instituição / Emissor (Opcional)</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="Ex: Itaú, Bradesco, Ticket Benefícios"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
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
                  Cadastrar Bandeira
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Bandeira */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
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
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Editar Bandeira</h3>
                <p className="text-xs text-[#ab8a7d]">Altere as informações da bandeira selecionada.</p>
              </div>
            </div>

            <form onSubmit={handleEditBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Bandeira</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Tipo do Cartão</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as any })}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                >
                  <option value="Crédito">Crédito</option>
                  <option value="Débito">Débito</option>
                  <option value="Voucher / Alimentação">Voucher / Alimentação / Refeição</option>
                  <option value="Múltiplo">Múltiplo (Crédito & Débito)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Emissor / Instituição</label>
                <input
                  type="text"
                  value={editingItem.issuer || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, issuer: e.target.value })}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
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

export default Bandeiras;
