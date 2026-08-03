import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fuel, 
  Search, 
  Pencil, 
  Trash2, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  X, 
  Save, 
  Building2 
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GasStation {
  id: string;
  user_id?: string;
  name: string;
  address?: string | null;
  brand: string;
  fuel_types?: string[] | null;
  created_at?: string;
}

const FUEL_TYPES_LIST = [
  'Etanol',
  'Gasolina Comum',
  'Gasolina Aditivada',
  'GNV',
  'Diesel',
];

const DEFAULT_STATIONS: GasStation[] = [
  {
    id: 'st-1',
    name: 'Posto Shell Express Central',
    address: 'Av. Paulista, 800 - São Paulo, SP',
    brand: 'Shell',
    fuel_types: ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol'],
  },
  {
    id: 'st-2',
    name: 'Posto BR Petrobras Nações',
    address: 'Av. das Nações Unidas, 1200 - São Paulo, SP',
    brand: 'BR (Petrobras)',
    fuel_types: ['Gasolina Comum', 'Etanol', 'Diesel'],
  },
  {
    id: 'st-3',
    name: 'Posto Ipiranga Rota Sul',
    address: 'Rodovia Anchieta, KM 18 - SP',
    brand: 'Ipiranga',
    fuel_types: ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'GNV'],
  },
  {
    id: 'st-4',
    name: 'Posto Ale Bandeira Branca',
    address: 'Rua Clélia, 450 - São Paulo, SP',
    brand: 'Bandeira Branca',
    fuel_types: ['Gasolina Comum', 'Etanol'],
  },
];

export const NovoPosto = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states para NOVO POSTO
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedFuels, setSelectedFuels] = useState<string[]>(['Gasolina Comum', 'Etanol']);

  // Lista de Postos Cadastrados + Busca
  const [stations, setStations] = useState<GasStation[]>(DEFAULT_STATIONS);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para EDIÇÃO DE POSTO
  const [editingStation, setEditingStation] = useState<GasStation | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editFuels, setEditFuels] = useState<string[]>([]);

  const loadStations = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data, error } = await supabase
        .from('gas_stations')
        .select('*')
        .eq('user_id', u.user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setStations(data as GasStation[]);
      } else {
        setStations(DEFAULT_STATIONS);
      }
    } catch (err) {
      console.error('Erro ao carregar postos:', err);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const toggleFuel = (fuel: string) => {
    setSelectedFuels((prev) =>
      prev.includes(fuel) ? prev.filter((f) => f !== fuel) : [...prev, fuel]
    );
  };

  const toggleEditFuel = (fuel: string) => {
    setEditFuels((prev) =>
      prev.includes(fuel) ? prev.filter((f) => f !== fuel) : [...prev, fuel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) {
      return toast.error('Nome do posto e Bandeira são obrigatórios.');
    }

    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { error } = await supabase.from('gas_stations').insert({
          user_id: u.user.id,
          name: name.trim(),
          address: address.trim() || null,
          brand: brand.trim(),
          fuel_types: selectedFuels,
        });

        if (error) {
          console.error('Erro no Supabase:', error.message);
        }
      }

      // Adiciona localmente caso o Supabase esteja offline ou simulado
      const newStation: GasStation = {
        id: `st-${Date.now()}`,
        name: name.trim(),
        address: address.trim() || null,
        brand: brand.trim(),
        fuel_types: selectedFuels,
      };

      setStations((prev) => [newStation, ...prev]);
      toast.success('Posto cadastrado com sucesso!');
      setName('');
      setAddress('');
      setBrand('');
      setSelectedFuels(['Gasolina Comum', 'Etanol']);
      loadStations();
    } catch (err: any) {
      toast.error('Erro ao cadastrar posto.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (station: GasStation) => {
    setEditingStation(station);
    setEditName(station.name);
    setEditAddress(station.address || '');
    setEditBrand(station.brand);
    setEditFuels(station.fuel_types || ['Gasolina Comum', 'Etanol']);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation) return;

    if (!editName.trim() || !editBrand.trim()) {
      return toast.error('Nome do posto e Bandeira são obrigatórios.');
    }

    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user && editingStation.id.length > 20) {
        await supabase
          .from('gas_stations')
          .update({
            name: editName.trim(),
            address: editAddress.trim() || null,
            brand: editBrand.trim(),
            fuel_types: editFuels,
          })
          .eq('id', editingStation.id);
      }

      setStations((prev) =>
        prev.map((st) =>
          st.id === editingStation.id
            ? {
                ...st,
                name: editName.trim(),
                address: editAddress.trim() || null,
                brand: editBrand.trim(),
                fuel_types: editFuels,
              }
            : st
        )
      );

      toast.success('Informações do posto atualizadas com sucesso!');
      setEditingStation(null);
    } catch (err) {
      toast.error('Erro ao editar posto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (id: string, stationName: string) => {
    if (!confirm(`Deseja remover o posto "${stationName}"?`)) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user && id.length > 20) {
        await supabase.from('gas_stations').delete().eq('id', id);
      }
      setStations((prev) => prev.filter((st) => st.id !== id));
      toast.success('Posto removido com sucesso!');
    } catch (err) {
      toast.error('Erro ao remover posto.');
    }
  };

  const filteredStations = stations.filter(
    (st) =>
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.address && st.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="CADASTRO DE POSTO" subtitle="Gerenciamento de Postos de Combustível" back />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-8">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center gap-4 shadow-xl">
          <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
            <Fuel className="size-7" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-white">Cadastrar Novo Posto</h2>
            <p className="text-xs text-[#ab8a7d] font-medium">
              Adicione postos parceiros para agilizar seus registros de abastecimento e despesas.
            </p>
          </div>
        </div>

        {/* ========================================================
           FORMULÁRIO DE CADASTRO DE NOVO POSTO
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-5 shadow-lg">
          <div className="flex items-center gap-2 text-[#ff5f00]">
            <Plus className="size-5" />
            <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
              Informações do Posto
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Nome do Posto
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Posto São José Express"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Bandeira do Posto
                </label>
                <input
                  list="brands-list"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Selecione ou digite (Shell, BR, Ipiranga...)"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
                <datalist id="brands-list">
                  <option value="Shell" />
                  <option value="BR (Petrobras)" />
                  <option value="Ipiranga" />
                  <option value="Ale" />
                  <option value="Menor Preço" />
                  <option value="Bandeira Branca" />
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                Endereço Completo (Opcional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Nações Unidas, 1500 - São Paulo, SP"
                className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-2">
                Combustíveis Disponíveis
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FUEL_TYPES_LIST.map((fuel) => {
                  const isChecked = selectedFuels.includes(fuel);
                  return (
                    <button
                      key={fuel}
                      type="button"
                      onClick={() => toggleFuel(fuel)}
                      className={`flex items-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold ${
                        isChecked
                          ? 'bg-[#ff5f00]/15 border-[#ff5f00] text-[#ff5f00]'
                          : 'bg-[#201f1f] border-stone-800 text-[#ab8a7d] hover:bg-[#252424]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="size-4 rounded accent-[#ff5f00]"
                      />
                      <span>{fuel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[56px] bg-[#ff5f00] text-black font-extrabold text-base uppercase tracking-wider rounded-2xl shadow-xl hover:bg-[#ffb599] active:scale-98 transition flex items-center justify-center gap-2 mt-4"
            >
              <Fuel className="size-5" />
              <span>{loading ? 'Salvação em andamento...' : 'Salvar Posto'}</span>
            </button>
          </form>
        </section>

        {/* ========================================================
           SEÇÃO DE POSTOS CADASTRADOS + CAMPO DE PESQUISA & EDIÇÃO
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#ff5f00]">
              <Fuel className="size-5" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                Postos de Gasolina Cadastrados
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#201f1f] border border-stone-800 text-xs font-bold text-[#ffb599]">
              Total: {filteredStations.length}
            </span>
          </div>

          {/* Campo de Pesquisa em Tempo Real */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#ab8a7d]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome, bandeira ou endereço para pesquisar um posto..."
              className="w-full h-14 pl-12 pr-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition placeholder:text-[#ab8a7d]/70"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ab8a7d] hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Lista dos Postos Encontrados com Ícone de Edição */}
          <div className="space-y-3">
            {filteredStations.length === 0 ? (
              <div className="text-center py-8 text-[#ab8a7d] bg-[#201f1f] rounded-2xl border border-stone-800">
                <p className="text-sm font-semibold">Nenhum posto encontrado para a busca especificada.</p>
              </div>
            ) : (
              filteredStations.map((st) => (
                <div
                  key={st.id}
                  className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 hover:border-[#ff5f00]/40 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-[#ff5f00]/15 text-[#ff5f00] rounded-xl shrink-0 group-hover:bg-[#ff5f00] group-hover:text-black transition">
                      <Fuel className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-white truncate">{st.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-black/40 text-[#ffb599] font-extrabold text-[10px] uppercase border border-stone-800">
                          {st.brand}
                        </span>
                      </div>
                      {st.address && (
                        <p className="text-xs text-[#ab8a7d] font-semibold mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="size-3 text-[#ff5f00] shrink-0" />
                          <span className="truncate">{st.address}</span>
                        </p>
                      )}
                      {st.fuel_types && st.fuel_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {st.fuel_types.map((f) => (
                            <span key={f} className="text-[9px] bg-white/5 text-stone-300 px-2 py-0.5 rounded-md font-bold">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações de Edição e Lixeira */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartEdit(st)}
                      className="p-2 text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl border border-[#ff5f00]/30 transition"
                      title="Editar informações deste posto"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStation(st.id, st.name)}
                      className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                      title="Remover posto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ========================================================
         MODAL DE EDIÇÃO DE POSTO DE GASOLINA
         ======================================================== */}
      {editingStation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
            <button
              onClick={() => setEditingStation(null)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                <Pencil className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Editar Posto de Gasolina</h3>
                <p className="text-xs text-[#ab8a7d]">Altere os dados do posto selecionado abaixo.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Nome do Posto
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Bandeira
                </label>
                <input
                  type="text"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-2">
                  Combustíveis Disponíveis
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FUEL_TYPES_LIST.map((fuel) => {
                    const isChecked = editFuels.includes(fuel);
                    return (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() => toggleEditFuel(fuel)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs font-bold ${
                          isChecked
                            ? 'bg-[#ff5f00]/15 border-[#ff5f00] text-[#ff5f00]'
                            : 'bg-[#201f1f] border-stone-800 text-[#ab8a7d]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="size-4 rounded accent-[#ff5f00]"
                        />
                        <span>{fuel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
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

export default NovoPosto;
