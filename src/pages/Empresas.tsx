import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Wrench, 
  Utensils, 
  Fuel, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  X, 
  Search,
  Save,
  ShoppingBag,
  Store,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  RotateCcw,
  Check
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPhoneMask, unformatPhone } from '@/lib/format';

interface EmpresaItem {
  id: string;
  name: string;
  category: string;
  phone?: string;
  address?: string;
  total_services?: number;
  last_service_date?: string;
}

const DEFAULT_CATEGORIES = [
  'Alimentação / Restaurante',
  'Oficina Mecânica',
  'Outros',
  'Peças & Acessórios',
  'Posto de Combustível',
].sort((a, b) => a.localeCompare(b, 'pt-BR'));

const DEFAULT_EMPRESAS: EmpresaItem[] = [
  {
    id: 'emp-1',
    name: 'Auto Elétrica & Mecânica Silva',
    category: 'Oficina Mecânica',
    phone: '11987654321',
    address: 'Av. das Nações Unidas, 1200 - SP',
    total_services: 4,
    last_service_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'emp-2',
    name: 'Restaurante & Churrascaria Motoqueiro',
    category: 'Alimentação / Restaurante',
    phone: '11976543210',
    address: 'Rua Vergueiro, 450 - SP',
    total_services: 12,
    last_service_date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'emp-3',
    name: 'Posto Shell Express Central',
    category: 'Posto de Combustível',
    phone: '1133445566',
    address: 'Av. Paulista, 800 - SP',
    total_services: 18,
    last_service_date: new Date().toISOString(),
  },
  {
    id: 'emp-4',
    name: 'MotoPeças & Pneus Fast',
    category: 'Peças & Acessórios',
    phone: '11912345678',
    address: 'Rua Clélia, 310 - SP',
    total_services: 3,
    last_service_date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'emp-5',
    name: 'Oficina MotoCenter Revisões',
    category: 'Oficina Mecânica',
    phone: '11998877665',
    address: 'Rua Conselheiro Nébias, 190 - SP',
    total_services: 6,
    last_service_date: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
];

// Componente para Card Deslizável (Swipe Right = Editar, Swipe Left = Excluir)
interface SwipeableCardProps {
  emp: EmpresaItem;
  onView: (emp: EmpresaItem) => void;
  onEdit: (emp: EmpresaItem) => void;
  onDelete: (id: string, name: string) => void;
  getCategoryIcon: (cat: string) => React.ReactNode;
}

const SwipeableEmpresaCard: React.FC<SwipeableCardProps> = ({
  emp,
  onView,
  onEdit,
  onDelete,
  getCategoryIcon,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const hasSwipedRef = useRef(false);

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    hasSwipedRef.current = false;
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) > 10) {
      hasSwipedRef.current = true;
    }
    // Limita a distância visual do deslize
    const clamped = Math.max(-140, Math.min(140, diff));
    setTranslateX(clamped);
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const diff = currentXRef.current - startXRef.current;

    // Reseta o deslocamento visual do card
    setTranslateX(0);

    if (diff > 45) {
      // Deslize da Esquerda para a Direita -> ENTRAR EM MODO DE EDIÇÃO DO REGISTRO
      hasSwipedRef.current = true;
      onEdit(emp);
    } else if (diff < -45) {
      // Deslize da Direita para a Esquerda -> EXCLUIR REGISTRO
      hasSwipedRef.current = true;
      onDelete(emp.id, emp.name);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Só entra no modo de visualização se NÃO houve gesto de deslizar (swipe)
    if (!hasSwipedRef.current) {
      onView(emp);
    }
    hasSwipedRef.current = false;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl group select-none touch-pan-y shadow-md">
      {/* Fundo Ação Esquerda -> Direita: EDITAR (Laranja) */}
      <div
        className="absolute inset-y-0 left-0 w-full bg-[#ff5f00] text-black font-extrabold flex items-center justify-start pl-6 gap-2 rounded-3xl transition-opacity"
        style={{ opacity: translateX > 10 ? Math.min(1, translateX / 60) : 0 }}
      >
        <Pencil className="size-6 stroke-[3]" />
        <span className="text-sm uppercase tracking-wider">EDITAR PRESTADORA</span>
      </div>

      {/* Fundo Ação Direita -> Esquerda: EXCLUIR (Vermelho) */}
      <div
        className="absolute inset-y-0 right-0 w-full bg-red-600 text-white font-extrabold flex items-center justify-end pr-6 gap-2 rounded-3xl transition-opacity"
        style={{ opacity: translateX < -10 ? Math.min(1, Math.abs(translateX) / 60) : 0 }}
      >
        <span className="text-sm uppercase tracking-wider">EXCLUIR PRESTADORA</span>
        <Trash2 className="size-6 stroke-[3]" />
      </div>

      {/* Conteúdo do Card Arrastável */}
      <div
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-stone-800 hover:border-[#ff5f00]/50 transition-colors space-y-3 relative cursor-grab active:cursor-grabbing z-10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-[#201f1f] rounded-2xl shrink-0 border border-stone-800 group-hover:border-[#ff5f00]/30 transition">
              {getCategoryIcon(emp.category)}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-white truncate group-hover:text-[#ff5f00] transition">
                {emp.name}
              </h3>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-[#201f1f] text-[#ffb599] font-extrabold text-[10px] uppercase border border-stone-800">
                {emp.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(emp);
              }}
              className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
              title="Editar Empresa"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(emp.id, emp.name);
              }}
              className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
              title="Remover Empresa"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-xs text-[#ab8a7d]">
          {emp.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-[#ff5f00]" />
              <span className="font-medium text-white">{formatPhoneMask(emp.phone)}</span>
            </div>
          )}

          {emp.address && (
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-[#ff5f00]" />
              <span className="font-medium text-white truncate">{emp.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Empresas = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaItem[]>(DEFAULT_EMPRESAS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtros Avançados e Ordenação
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'services-desc' | 'recent'>('name-asc');
  const [filterAddress, setFilterAddress] = useState<string>('');
  const [onlyWithAddress, setOnlyWithAddress] = useState<boolean>(false);

  // Form para nova empresa e novas categorias
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Oficina Mecânica');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Visualização e Edição
  const [viewingItem, setViewingItem] = useState<EmpresaItem | null>(null);
  const [editingItem, setEditingItem] = useState<EmpresaItem | null>(null);

  useEffect(() => {
    // Carregar oficinas e estabelecimentos dos históricos de despesas e manutenção
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;

        const { data: oilData } = await supabase
          .from('oil_changes' as any)
          .select('notes, changed_at')
          .eq('user_id', u.user.id);

        if (oilData && oilData.length > 0) {
          // Extrai nomes de empresas/oficinas de observações
          const extracted: EmpresaItem[] = [...DEFAULT_EMPRESAS];
          oilData.forEach((row: any, idx: number) => {
            if (row.notes && row.notes.includes('(') && row.notes.includes(')')) {
              const matches = row.notes.match(/\(([^)]+)\)/);
              if (matches && matches[1]) {
                const compName = matches[1].trim();
                if (!extracted.some((e) => e.name.toLowerCase() === compName.toLowerCase())) {
                  extracted.push({
                    id: `ext-${idx}`,
                    name: compName,
                    category: 'Oficina Mecânica',
                    phone: '11900000000',
                    address: 'Endereço registrado via manutenção',
                    total_services: 1,
                    last_service_date: row.changed_at,
                  });
                }
              }
            }
          });
          setEmpresas(extracted);
        }
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      }
    })();
  }, []);

  const handleAddEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da prestadora de serviços.');
      return;
    }

    const rawDigits = unformatPhone(phone);

    const newEmpresa: EmpresaItem = {
      id: `emp-${Date.now()}`,
      name: name.trim(),
      category,
      phone: rawDigits || undefined,
      address: address.trim() || undefined,
      total_services: 1,
      last_service_date: new Date().toISOString(),
    };

    setEmpresas((prev) => [newEmpresa, ...prev]);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setAddress('');
    setCategory('Oficina Mecânica');
    toast.success(`Prestadora de serviço "${newEmpresa.name}" cadastrada!`);
  };

  const handleEditEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Quando for armazenado no banco de dados, é enviada apenas a numeração (SEM a máscara)
    const rawDigits = editingItem.phone ? unformatPhone(editingItem.phone) : undefined;
    const updatedItem: EmpresaItem = {
      ...editingItem,
      name: editingItem.name.trim(),
      phone: rawDigits || undefined,
      address: editingItem.address ? editingItem.address.trim() : undefined,
    };

    setEmpresas((prev) =>
      prev.map((eItem) => (eItem.id === editingItem.id ? updatedItem : eItem))
    );

    setEditingItem(null);
    toast.success('Informações da empresa atualizadas!');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Esta categoria já existe.');
      return;
    }

    setCategories((prev) =>
      [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    );

    if (editingItem) {
      setEditingItem({ ...editingItem, category: trimmed });
    } else {
      setCategory(trimmed);
    }

    setNewCategoryName('');
    setShowAddCategoryModal(false);
    toast.success(`Nova categoria "${trimmed}" adicionada com sucesso!`);
  };

  const handleDeleteEmpresa = (id: string, empName: string) => {
    if (!confirm(`Deseja remover "${empName}"?`)) return;
    setEmpresas((prev) => prev.filter((eItem) => eItem.id !== id));
    toast.success('Prestadora de serviços removida.');
  };

  const handleResetFilters = () => {
    setFilterCategory('Todas');
    setSortBy('name-asc');
    setFilterAddress('');
    setOnlyWithAddress(false);
    setSearchTerm('');
    toast.info('Filtros redefinidos.');
  };

  // Verifica se há filtros ativos além dos padrões
  const isFilterActive =
    filterCategory !== 'Todas' ||
    sortBy !== 'name-asc' ||
    filterAddress.trim() !== '' ||
    onlyWithAddress;

  // Filtragem e Ordenação da Lista de Empresas
  const filteredList = empresas
    .filter((emp) => {
      const matchesCat = filterCategory === 'Todas' || emp.category === filterCategory;
      const matchesSearch =
        !searchTerm.trim() ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.address && emp.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAddress =
        !filterAddress.trim() ||
        (emp.address && emp.address.toLowerCase().includes(filterAddress.toLowerCase()));

      const matchesOnlyAddress = !onlyWithAddress || Boolean(emp.address && emp.address.trim());

      return matchesCat && matchesSearch && matchesAddress && matchesOnlyAddress;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'pt-BR');
      }
      if (sortBy === 'services-desc') {
        return (b.total_services ?? 0) - (a.total_services ?? 0);
      }
      if (sortBy === 'recent') {
        const dateA = a.last_service_date ? new Date(a.last_service_date).getTime() : 0;
        const dateB = b.last_service_date ? new Date(b.last_service_date).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

  const getCategoryIcon = (cat: EmpresaItem['category']) => {
    switch (cat) {
      case 'Oficina Mecânica':
        return <Wrench className="size-6 text-[#ff5f00]" />;
      case 'Alimentação / Restaurante':
        return <Utensils className="size-6 text-emerald-400" />;
      case 'Posto de Combustível':
        return <Fuel className="size-6 text-amber-400" />;
      case 'Peças & Acessórios':
        return <ShoppingBag className="size-6 text-sky-400" />;
      default:
        return <Store className="size-6 text-purple-400" />;
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="PRESTADORAS DE SERVIÇOS" subtitle="Empresas, Oficinas e Restaurantes Cadastrados" back />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Superior */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <Building2 className="size-7" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Prestadoras de Serviços</h2>
              <p className="text-xs text-[#ab8a7d] font-medium">
                Empresas parceiras, oficinas, restaurantes e postos utilizados nas manutenções e despesas.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="size-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
            title="Cadastrar Nova Empresa"
          >
            <Plus className="size-6 stroke-[3]" />
          </button>
        </div>

        {/* Busca e Botão de Filtros */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#ab8a7d]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, categoria ou endereço..."
                className="w-full h-14 pl-12 pr-4 bg-[#1c1b1b] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`h-14 px-4 rounded-2xl border-2 flex items-center gap-2 font-extrabold text-sm transition shrink-0 ${
                isFilterActive
                  ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                  : 'bg-[#1c1b1b] text-[#ab8a7d] border-stone-800 hover:text-white'
              }`}
              title="Abrir Opções de Filtro e Ordenação"
            >
              <SlidersHorizontal className="size-5" />
              <span className="hidden sm:inline">Filtros</span>
              {isFilterActive && <span className="size-2 rounded-full bg-black animate-pulse" />}
            </button>
          </div>

          {/* Filtro Rápido por Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['Todas', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition border ${
                  filterCategory === cat
                    ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                    : 'bg-[#1c1b1b] text-[#ab8a7d] border-stone-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dica de Uso com Deslize (Slide Gesture) */}
          <div className="flex flex-col items-center justify-center text-center text-xs text-[#ab8a7d] py-1 space-y-0.5 font-medium">
            <span className="text-[#ffb599] font-bold">➔ Direita: Edita</span>
            <span className="text-red-400 font-bold">⬅ Esquerda: Excluir</span>
          </div>
        </div>

        {/* Lista de Empresas (com Função Slide / Touch Swipe) */}
        <div className="space-y-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 space-y-2">
              <p className="text-sm font-semibold">Nenhuma prestadora de serviços encontrada.</p>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#ff5f00] font-bold underline hover:text-[#ffb599]"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : (
            filteredList.map((emp) => (
              <SwipeableEmpresaCard
                key={emp.id}
                emp={emp}
                onView={setViewingItem}
                onEdit={setEditingItem}
                onDelete={handleDeleteEmpresa}
                getCategoryIcon={getCategoryIcon}
              />
            ))
          )}
        </div>
      </main>

      {/* Modal de Filtros Avançados e Ordenação */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-6 text-[#e5e2e1] relative">
            <button
              onClick={() => setShowFilterModal(false)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
                <SlidersHorizontal className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Filtros & Ordenação</h3>
                <p className="text-xs text-[#ab8a7d]">Personalize a exibição das empresas.</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Ordenação */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-2">Organizar Por</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'name-asc', label: 'Nome (A - Z)' },
                    { id: 'name-desc', label: 'Nome (Z - A)' },
                    { id: 'services-desc', label: 'Mais Serviços' },
                    { id: 'recent', label: 'Mais Recentes' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSortBy(option.id as any)}
                      className={`p-3 rounded-2xl text-xs font-extrabold text-left transition border flex items-center justify-between ${
                        sortBy === option.id
                          ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                          : 'bg-[#201f1f] text-[#e5e2e1] border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.id && <Check className="size-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro Por Categoria */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Filtrar por Categoria</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                >
                  <option value="Todas">Todas as Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Por Endereço / Cidade */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Filtrar por Endereço / Cidade</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#ab8a7d]" />
                  <input
                    type="text"
                    value={filterAddress}
                    onChange={(e) => setFilterAddress(e.target.value)}
                    placeholder="Ex: Paulista, Vergueiro, SP..."
                    className="w-full h-14 pl-12 pr-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  />
                </div>
              </div>

              {/* Checkbox: Somente empresas com endereço */}
              <label className="flex items-center gap-3 bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithAddress}
                  onChange={(e) => setOnlyWithAddress(e.target.checked)}
                  className="size-4 accent-[#ff5f00] rounded"
                />
                <span className="text-xs font-bold text-white">Somente empresas com endereço cadastrado</span>
              </label>
            </div>

            {/* Ações do Modal de Filtros */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition flex items-center justify-center gap-2 border border-stone-800"
              >
                <RotateCcw className="size-4" />
                <span>Limpar</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="size-4 stroke-[3]" />
                <span>Aplicar Filtros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Empresa */}
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
                <Building2 className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Nova Prestadora de Serviços</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre uma oficina, restaurante, posto ou parceiro.</p>
              </div>
            </div>

            <form onSubmit={handleAddEmpresa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Empresa</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Oficina Mecânica MotoSpeed"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Categoria</label>
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(true)}
                    className="size-14 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
                    title="Adicionar Nova Categoria"
                  >
                    <Plus className="size-6 stroke-[3]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Telefone / Celular (Opcional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                  placeholder="(00) 0.0000-0000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Endereço (Opcional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Paulista, 1000 - SP"
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
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Empresa */}
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
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Editar Prestadora de Serviços</h3>
                <p className="text-xs text-[#ab8a7d]">Altere os dados da empresa selecionada.</p>
              </div>
            </div>

            <form onSubmit={handleEditEmpresa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Empresa</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Categoria</label>
                <div className="flex items-center gap-2">
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="flex-1 h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(true)}
                    className="size-14 rounded-2xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center shrink-0 hover:bg-[#ffb599] active:scale-95 transition shadow-lg"
                    title="Adicionar Nova Categoria"
                  >
                    <Plus className="size-6 stroke-[3]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Telefone / Celular</label>
                <input
                  type="text"
                  value={editingItem.phone ? formatPhoneMask(editingItem.phone) : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, phone: formatPhoneMask(e.target.value) })}
                  placeholder="(00) 0.0000-0000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Endereço</label>
                <input
                  type="text"
                  value={editingItem.address || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
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

      {/* Modal Visualizar Empresa (Apenas Exibição) */}
      {viewingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-6 text-[#e5e2e1] relative">
            
            {/* Cabeçalho do Modal: Título, Categoria e Botão de Edição no Topo */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-3.5 bg-[#201f1f] rounded-2xl border border-stone-800 text-[#ff5f00] shrink-0">
                  {getCategoryIcon(viewingItem.category)}
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#ff5f00]/15 text-[#ff5f00] font-extrabold text-[10px] uppercase border border-[#ff5f00]/30 mb-1">
                    {viewingItem.category}
                  </span>
                  <h3 className="font-extrabold text-sm text-[#ab8a7d] uppercase tracking-wider block">
                    Detalhes da Empresa
                  </h3>
                </div>
              </div>

              {/* Ícone de Edição no Topo e Botão de Fechar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const itemToEdit = viewingItem;
                    setViewingItem(null);
                    setEditingItem(itemToEdit);
                  }}
                  className="p-2.5 rounded-2xl bg-[#ff5f00]/20 text-[#ff5f00] hover:bg-[#ff5f00] hover:text-black transition flex items-center gap-1.5 font-extrabold text-xs shadow-md border border-[#ff5f00]/30"
                  title="Editar dados desta prestadora"
                >
                  <Pencil className="size-4" />
                  <span className="hidden sm:inline">Editar</span>
                </button>

                <button
                  onClick={() => setViewingItem(null)}
                  className="p-2.5 text-[#ab8a7d] hover:text-white rounded-2xl bg-[#201f1f] border border-stone-800 hover:bg-stone-800 transition"
                  title="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo em Modo Apenas Exibição */}
            <div className="space-y-4">
              {/* Nome da Empresa */}
              <div>
                <label className="text-[11px] font-bold uppercase text-[#ab8a7d] tracking-wide block mb-1">
                  Nome da Empresa / Estabelecimento
                </label>
                <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800">
                  <p className="text-lg font-extrabold text-white leading-tight">
                    {viewingItem.name}
                  </p>
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="text-[11px] font-bold uppercase text-[#ab8a7d] tracking-wide block mb-1">
                  Telefone / Celular
                </label>
                <div className="flex items-center gap-3 bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                  <Phone className="size-4 text-[#ff5f00] shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {viewingItem.phone ? formatPhoneMask(viewingItem.phone) : 'Não cadastrado'}
                  </span>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="text-[11px] font-bold uppercase text-[#ab8a7d] tracking-wide block mb-1">
                  Endereço
                </label>
                <div className="flex items-start gap-3 bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                  <MapPin className="size-4 text-[#ff5f00] shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-white leading-relaxed">
                    {viewingItem.address || 'Não cadastrado'}
                  </span>
                </div>
              </div>

              {/* Resumo de Serviços e Histórico */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                  <span className="text-[10px] font-extrabold text-[#ab8a7d] uppercase block mb-0.5">
                    Total de Serviços
                  </span>
                  <span className="text-lg font-extrabold text-[#ffb599]">
                    {viewingItem.total_services ?? 1}x realizados
                  </span>
                </div>

                <div className="bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                  <span className="text-[10px] font-extrabold text-[#ab8a7d] uppercase block mb-0.5">
                    Último Serviço
                  </span>
                  <span className="text-xs font-bold text-white mt-1 block truncate">
                    {viewingItem.last_service_date
                      ? new Date(viewingItem.last_service_date).toLocaleDateString('pt-BR')
                      : 'Recente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="flex-1 h-12 rounded-2xl bg-[#201f1f] hover:bg-[#252424] text-[#e5e2e1] font-bold text-sm border border-stone-800 transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemToEdit = viewingItem;
                  setViewingItem(null);
                  setEditingItem(itemToEdit);
                }}
                className="flex-1 h-12 rounded-2xl bg-[#ff5f00] hover:bg-[#ffb599] text-black font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Pencil className="size-4" />
                <span>Alterar Dados</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-sm bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-4 text-[#e5e2e1] relative">
            <button
              type="button"
              onClick={() => {
                setShowAddCategoryModal(false);
                setNewCategoryName('');
              }}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
                <Plus className="size-5 stroke-[3]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white uppercase tracking-tight">Nova Categoria</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre uma nova categoria de serviço.</p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Categoria</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Lava Rápido / Guincho"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empresas;
