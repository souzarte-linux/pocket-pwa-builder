import React, { useState, useRef, useMemo } from 'react';
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
  X, 
  Search,
  Save,
  ShoppingBag,
  Store,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { useCompanyMutations } from '@/hooks/mutations/useCompanyMutations';
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
  cnpj?: string;
}

const DEFAULT_CATEGORIES = [
  'Alimentação / Restaurante',
  'Oficina Mecânica',
  'Outros',
  'Peças & Acessórios',
  'Posto de Combustível',
].sort((a, b) => a.localeCompare(b, 'pt-BR'));

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
    const clamped = Math.max(-140, Math.min(140, diff));
    setTranslateX(clamped);
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const diff = currentXRef.current - startXRef.current;
    setTranslateX(0);

    if (diff > 45) {
      hasSwipedRef.current = true;
      onEdit(emp);
    } else if (diff < -45) {
      hasSwipedRef.current = true;
      onDelete(emp.id, emp.name);
    }
  };

  const handleClick = () => {
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
  const { user } = useAuth();
  const { data: dbCompanies = [], isLoading, isError, refetch } = useCompanies(user?.id);
  const { createCompany, updateCompany, deleteCompany, isCreating, isUpdating } = useCompanyMutations();

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

  // Mapeia registros reais de public.companies para EmpresaItem
  const empresas: EmpresaItem[] = useMemo(() => {
    return dbCompanies.map((c) => {
      const fullAddr = [c.address, c.number, c.complement, c.cep].filter(Boolean).join(', ') || c.address || undefined;
      return {
        id: c.id,
        name: c.name,
        category: c.category || 'Outros',
        phone: c.phone || undefined,
        address: fullAddr,
        cnpj: c.cnpj || undefined,
        last_service_date: c.created_at,
        total_services: 1,
      };
    });
  }, [dbCompanies]);

  // Atualiza categorias dinamicamente com as categorias existentes no banco
  useMemo(() => {
    const existingCats = dbCompanies.map((c) => c.category).filter((cat): cat is string => Boolean(cat));
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCats])).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    setCategories(merged);
  }, [dbCompanies]);

  const handleAddEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da prestadora de serviços.');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    const rawDigits = unformatPhone(phone);

    try {
      await createCompany({
        user_id: user.id,
        name: name.trim(),
        category,
        phone: rawDigits || null,
        address: address.trim() || null,
      });

      setShowAddModal(false);
      setName('');
      setPhone('');
      setAddress('');
      setCategory('Oficina Mecânica');
      toast.success(`Prestadora de serviço "${name.trim()}" cadastrada!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar';
      toast.error(`Erro ao cadastrar empresa: ${msg}`);
    }
  };

  const handleEditEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const rawDigits = editingItem.phone ? unformatPhone(editingItem.phone) : null;

    try {
      await updateCompany({
        id: editingItem.id,
        payload: {
          name: editingItem.name.trim(),
          category: editingItem.category,
          phone: rawDigits,
          address: editingItem.address ? editingItem.address.trim() : null,
        },
      });

      setEditingItem(null);
      toast.success('Informações da empresa atualizadas!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar';
      toast.error(`Erro ao atualizar empresa: ${msg}`);
    }
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

  const handleDeleteEmpresa = async (id: string, empName: string) => {
    if (!confirm(`Deseja remover "${empName}"?`)) return;
    try {
      await deleteCompany(id);
      toast.success('Prestadora de serviços removida.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover';
      toast.error(`Erro ao remover empresa: ${msg}`);
    }
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
  const filteredList = useMemo(() => {
    return empresas
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
  }, [empresas, filterCategory, searchTerm, filterAddress, onlyWithAddress, sortBy]);

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

          {/* Dica de Uso com Deslize (Slide Gesture) */}
          <div className="flex flex-col items-center justify-center text-center text-xs py-1 space-y-1 font-bold">
            <span className="text-[#ffb599] flex items-center justify-center gap-1.5">
              <ArrowRight className="size-4 stroke-[2.5]" />
              <span>Direita: Edita</span>
            </span>
            <span className="text-red-400 flex items-center justify-center gap-1.5">
              <ArrowLeft className="size-4 stroke-[2.5]" />
              <span>Esquerda: Excluir</span>
            </span>
          </div>
        </div>

        {/* Estado de Carregamento */}
        {isLoading && (
          <div className="text-center py-12 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-[#ff5f00] animate-spin" />
            <p className="text-sm font-semibold">Carregando prestadoras de serviços...</p>
          </div>
        )}

        {/* Estado de Erro */}
        {isError && (
          <div className="text-center py-10 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-red-900/40 p-6 space-y-3">
            <AlertCircle className="size-8 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-white">Falha ao carregar prestadoras de serviços.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#ff5f00] text-black font-extrabold text-xs rounded-xl hover:bg-[#ffb599] transition"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Lista de Empresas (com Função Slide / Touch Swipe) */}
        {!isLoading && !isError && (
          <div className="space-y-4">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 space-y-4 p-6">
                <Building2 className="size-10 text-stone-600 mx-auto" />
                <p className="text-sm font-semibold text-white">
                  {empresas.length === 0
                    ? 'Nenhuma prestadora de serviços cadastrada ainda.'
                    : 'Nenhuma prestadora encontrada com os filtros selecionados.'}
                </p>
                {isFilterActive && empresas.length > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-[#ff5f00] font-bold underline hover:text-[#ffb599]"
                  >
                    Limpar todos os filtros
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-3 bg-[#ff5f00] text-black font-extrabold text-xs rounded-2xl hover:bg-[#ffb599] transition shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="size-4 stroke-[3]" />
                    <span>Cadastrar Primeira Prestadora</span>
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
        )}
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
                    { id: 'name-asc' as const, label: 'Nome (A - Z)' },
                    { id: 'name-desc' as const, label: 'Nome (Z - A)' },
                    { id: 'services-desc' as const, label: 'Mais Serviços' },
                    { id: 'recent' as const, label: 'Mais Recentes' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSortBy(option.id)}
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
                  disabled={isCreating}
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>{isCreating ? 'Cadastrando...' : 'Cadastrar'}</span>
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
                  disabled={isUpdating}
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  <span>{isUpdating ? 'Salvando...' : 'Salvar Alterações'}</span>
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
