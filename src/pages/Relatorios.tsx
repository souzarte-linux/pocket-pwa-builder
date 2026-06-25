import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatKm, formatHours } from '@/lib/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Clock,
  Gauge,
  MapPin,
  Package,
  Route as RouteIcon,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Wrench,
  Fuel,
  Droplet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

type Period = 'dia' | 'semana' | 'quinzena' | 'mes' | 'ano' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'quinzena', label: 'Quinzena' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
  { id: 'custom', label: 'Intervalo' },
];

const startOf = (p: Period): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'dia') return d;
  if (p === 'semana') {
    // Week starts on Monday
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }
  if (p === 'quinzena') {
    d.setDate(d.getDate() - 14);
    return d;
  }
  if (p === 'mes') {
    d.setDate(1);
    return d;
  }
  if (p === 'ano') {
    const y = new Date();
    y.setMonth(0, 1);
    y.setHours(0, 0, 0, 0);
    return y;
  }
  return d;
};

const endOf = (p: Period): Date => {
  const start = startOf(p);
  const e = new Date(start);
  if (p === 'dia') {
    e.setDate(e.getDate() + 1);
  } else if (p === 'semana') {
    e.setDate(e.getDate() + 7); // Mon + 7 = next Mon (covers through Sunday 23:59)
  } else if (p === 'quinzena') {
    e.setDate(e.getDate() + 15);
  } else if (p === 'mes') {
    e.setMonth(e.getMonth() + 1);
  } else if (p === 'ano') {
    e.setFullYear(e.getFullYear() + 1);
  }
  e.setMilliseconds(e.getMilliseconds() - 1);
  return e;
};

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

interface Route {
  amount: number;
  tip: number;
  distance_km: number;
  platform_id: string | null;
  product_type: string;
  origin: string | null;
  destination: string | null;
  occurred_at: string;
  started_at: string | null;
  ended_at: string | null;
  break_minutes: number;
  package_count: number | null;
  package_unit_price: number | null;
  small_packages_count?: number | null;
  large_packages_count?: number | null;
  large_packages_prices?: number[] | null;
}
interface DailyTotal {
  amount: number;
  distance_km: number | null;
  platform_id: string | null;
  product_type: string;
  occurred_at: string;
  subtract_routes: boolean;
}
interface Expense {
  amount: number;
  category: string;
  occurred_at: string;
  title?: string | null;
  liters?: number | null;
  odometer_km?: number | null;
}
interface Platform {
  id: string;
  name: string;
}
interface BillingCycle {
  total_amount: number;
  expected_payment_date: string;
}
interface OilChange {
  changed_at: string;
  km_at_change: number;
}
interface MaintProfile {
  oil_change_km: number | null;
  last_oil_change_at: string | null;
}

const COLORS = [
  'hsl(19 100% 50%)',
  'hsl(41 100% 50%)',
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(280 80% 60%)',
  'hsl(0 84% 60%)',
];

const Relatorios = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('semana');
  const [customStart, setCustomStart] = useState<string>(daysAgoISO(7));
  const [customEnd, setCustomEnd] = useState<string>(todayISO());
  const [routes, setRoutes] = useState<Route[]>([]);
  const [dailies, setDailies] = useState<DailyTotal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [oilChanges, setOilChanges] = useState<OilChange[]>([]);
  const [allMaintExpenses, setAllMaintExpenses] = useState<Expense[]>([]);
  const [allFuelExpenses, setAllFuelExpenses] = useState<Expense[]>([]);
  const [maintProfile, setMaintProfile] = useState<MaintProfile | null>(null);
  const [maxRouteKm, setMaxRouteKm] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const range = useMemo(() => {
    if (period === 'custom') {
      const s = new Date(`${customStart}T00:00:00`);
      const e = new Date(`${customEnd}T23:59:59.999`);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return { since: startOf('semana'), until: endOf('semana') };
      }
      return { since: s, until: e };
    }
    return { since: startOf(period), until: endOf(period) };
  }, [period, customStart, customEnd]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sinceISO = range.since.toISOString();
      const untilISO = range.until.toISOString();
      const [r, d, e, p, b] = await Promise.all([
        supabase
          .from('routes')
          .select('amount, tip, distance_km, platform_id, product_type, origin, destination, occurred_at, package_count, package_unit_price, started_at, ended_at, break_minutes, small_packages_count, large_packages_count, large_packages_prices')
          .gte('occurred_at', sinceISO)
          .lte('occurred_at', untilISO),
        supabase
          .from('daily_totals')
          .select('amount, distance_km, platform_id, product_type, occurred_at, subtract_routes')
          .gte('occurred_at', sinceISO)
          .lte('occurred_at', untilISO),
        supabase.from('expenses').select('amount, category, occurred_at, title, liters, odometer_km')
          .gte('occurred_at', sinceISO).lte('occurred_at', untilISO),
        supabase.from('platforms').select('id, name'),
        supabase.from('billing_cycles').select('id, expected_payment_date').eq('status', 'open').gte('expected_payment_date', todayISO()),
      ]);
      setRoutes((r.data ?? []) as Route[]);
      setDailies((d.data ?? []) as DailyTotal[]);
      setExpenses((e.data ?? []) as Expense[]);
      setPlatforms((p.data ?? []) as Platform[]);
      const cycles = (b.data ?? []) as { id: string; expected_payment_date: string }[];
      const cycleIds = cycles.map((c) => c.id);
      let totalsByCycle: Record<string, number> = {};
      if (cycleIds.length > 0) {
        const rRes = await supabase.from('routes').select('amount, tip, billing_cycle_id').in('billing_cycle_id', cycleIds);
        (rRes.data ?? []).forEach((row: { amount: number; tip: number | null; billing_cycle_id: string | null }) => {
          if (!row.billing_cycle_id) return;
          totalsByCycle[row.billing_cycle_id] = (totalsByCycle[row.billing_cycle_id] ?? 0) + Number(row.amount) + Number(row.tip ?? 0);
        });
      }
      setBillingCycles(cycles.map((c) => ({ total_amount: totalsByCycle[c.id] ?? 0, expected_payment_date: c.expected_payment_date })));
      setLoading(false);
    };
    load();
  }, [range]);

  // Load maintenance-related historical data (once on mount)
  useEffect(() => {
    const loadMaint = async () => {
      const [profRes, oilRes, expAllRes, routesAllRes] = await Promise.all([
        supabase.from('profiles').select('oil_change_km, last_oil_change_at').maybeSingle(),
        supabase.from('oil_changes').select('changed_at, km_at_change').order('changed_at', { ascending: false }),
        supabase.from('expenses').select('amount, category, occurred_at, title, liters, odometer_km')
          .in('category', ['combustivel', 'manutencao']),
        supabase.from('routes').select('end_km, start_km'),
      ]);
      if (profRes.data) setMaintProfile(profRes.data as MaintProfile);
      const oc = (oilRes.data ?? []) as OilChange[];
      setOilChanges(oc);
      const allExp = (expAllRes.data ?? []) as Expense[];
      setAllFuelExpenses(allExp.filter((e) => e.category === 'combustivel'));
      setAllMaintExpenses(allExp.filter((e) => e.category === 'manutencao'));
      let maxKm = 0;
      (routesAllRes.data ?? []).forEach((r: { end_km: number | null; start_km: number | null }) => {
        const v = Math.max(Number(r.end_km ?? 0), Number(r.start_km ?? 0));
        if (v > maxKm) maxKm = v;
      });
      setMaxRouteKm(maxKm);
    };
    loadMaint();
  }, []);



  const platformName = (id: string | null) =>
    (id && platforms.find((p) => p.id === id)?.name) || 'Sem plataforma';

  const stats = useMemo(() => {
    // Filter routes and dailies based on selected platform
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);
    
    const filteredDailies = selectedPlatform === 'all' 
      ? dailies 
      : dailies.filter(d => d.platform_id === selectedPlatform);

    const totalRevenue =
      filteredRoutes.reduce((s, r) => s + Number(r.amount) + Number(r.tip ?? 0), 0) +
      filteredDailies.reduce((s, d) => s + Number(d.amount), 0);
    const totalKm =
      filteredRoutes.reduce((s, r) => s + Number(r.distance_km ?? 0), 0) +
      filteredDailies.reduce((s, d) => s + Number(d.distance_km ?? 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const profit = totalRevenue - totalExpense;
    
    const totalMs = filteredRoutes.reduce((s, r) => {
      if (!r.started_at) return s;
      const start = new Date(r.started_at).getTime();
      const end = r.ended_at ? new Date(r.ended_at).getTime() : start;
      const effectiveStart = Math.max(start, range.since.getTime());
      const effectiveEnd = Math.min(end, range.until.getTime());
      const duration = Math.max(0, effectiveEnd - effectiveStart);
      const breakMs = (r.break_minutes ?? 0) * 60000;
      return s + Math.max(0, duration - breakMs);
    }, 0);
    const hours = totalMs / 3600000;
    const totalSmallPackages = filteredRoutes.reduce((s, r) => s + Number(r.small_packages_count ?? r.package_count ?? 0), 0);
    const totalLargePackages = filteredRoutes.reduce((s, r) => s + Number(r.large_packages_count ?? 0), 0);
    const totalPackages = totalSmallPackages + totalLargePackages;
    
    const smallPackagesValue = filteredRoutes.reduce((s, r) => {
      if (r.product_type !== 'pacote') return s;
      const count = Number(r.small_packages_count ?? r.package_count ?? 0);
      const price = Number(r.package_unit_price ?? 0);
      return s + (count * price);
    }, 0);

    const largePackagesValue = filteredRoutes.reduce((s, r) => {
      if (r.product_type !== 'pacote') return s;
      const prices = (r as any).large_packages_prices as number[] ?? [];
      return s + prices.reduce((sum, p) => sum + Number(p), 0);
    }, 0);

    return {
      totalRevenue,
      totalKm,
      totalExpense,
      profit,
      hours,
      totalSmallPackages,
      totalLargePackages,
      totalPackages,
      smallPackagesValue,
      largePackagesValue,
      revPerKm: totalKm > 0 ? totalRevenue / totalKm : 0,
      costPerKm: totalKm > 0 ? totalExpense / totalKm : 0,
      profitPerKm: totalKm > 0 ? profit / totalKm : 0,
      revPerHour: hours > 0 ? totalRevenue / hours : 0,
      profitPerHour: hours > 0 ? profit / hours : 0,
      routeCount: filteredRoutes.length,
      avgTicket: filteredRoutes.length > 0 ? totalRevenue / filteredRoutes.length : 0,
      avgPackagePrice: totalPackages > 0
        ? filteredRoutes.reduce((s, r) => s + Number(r.amount), 0) / totalPackages
        : 0,
    };
  }, [routes, dailies, expenses, selectedPlatform, range.since, range.until, platformName]);

  // Real fuel consumption in the period (km/L)
  const realConsumption = useMemo(() => {
    const periodFuel = expenses.filter((e) => e.category === 'combustivel');
    const liters = periodFuel.reduce((s, e) => s + Number(e.liters ?? 0), 0);
    if (liters <= 0) return 0;
    return stats.totalKm / liters;
  }, [expenses, stats.totalKm]);

  // Estimated current odometer
  const currentOdometer = useMemo(() => {
    let max = maxRouteKm;
    allFuelExpenses.forEach((e) => {
      const v = Number(e.odometer_km ?? 0);
      if (v > max) max = v;
    });
    allMaintExpenses.forEach((e) => {
      const v = Number(e.odometer_km ?? 0);
      if (v > max) max = v;
    });
    oilChanges.forEach((o) => {
      const v = Number(o.km_at_change ?? 0);
      if (v > max) max = v;
    });
    return max;
  }, [maxRouteKm, allFuelExpenses, allMaintExpenses, oilChanges]);

  // Period maintenance cost breakdown
  const maintCostBreakdown = useMemo(() => {
    const oilKeywords = /\b(oleo|óleo|filtro)\b/i;
    let fuel = 0;
    let oil = 0;
    let parts = 0;
    expenses.forEach((e) => {
      const amt = Number(e.amount);
      if (e.category === 'combustivel') fuel += amt;
      else if (e.category === 'manutencao') {
        if (e.title && oilKeywords.test(e.title)) oil += amt;
        else parts += amt;
      }
    });
    return { fuel, oil, parts, total: fuel + oil + parts };
  }, [expenses]);

  // Preventive maintenance schedule
  const maintSchedule = useMemo(() => {
    const findLastKm = (regex: RegExp): number | null => {
      let best: { km: number; date: string } | null = null;
      allMaintExpenses.forEach((e) => {
        if (!e.title || !regex.test(e.title)) return;
        const km = Number(e.odometer_km ?? 0);
        if (!best || new Date(e.occurred_at) > new Date(best.date)) {
          best = { km, date: e.occurred_at };
        }
      });
      return best ? best.km : null;
    };

    // Last oil change: prefer oil_changes table, fall back to expenses
    let lastOilKm: number | null = null;
    if (oilChanges.length > 0) lastOilKm = Number(oilChanges[0].km_at_change ?? 0);
    if (lastOilKm == null) lastOilKm = findLastKm(/\b(oleo|óleo)\b/i);

    const oilLife = Number(maintProfile?.oil_change_km ?? 3000) || 3000;

    const items: { name: string; lifeKm: number; lastKm: number | null }[] = [
      { name: 'Troca de Óleo', lifeKm: oilLife, lastKm: lastOilKm },
      { name: 'Kit Relação', lifeKm: 15000, lastKm: findLastKm(/relaç|relac|corrent|coroa|pinhão|pinhao/i) },
      { name: 'Pneu Dianteiro', lifeKm: 15000, lastKm: findLastKm(/pneu.*diant|diant.*pneu/i) },
      { name: 'Pneu Traseiro', lifeKm: 10000, lastKm: findLastKm(/pneu.*tras|tras.*pneu/i) },
      { name: 'Pastilhas de Freio', lifeKm: 5000, lastKm: findLastKm(/pastilh|freio/i) },
      { name: 'Vela de Ignição', lifeKm: 10000, lastKm: findLastKm(/vela|igniç|ignic/i) },
    ];

    return items.map((it) => {
      const nextKm = (it.lastKm ?? 0) + it.lifeKm;
      const remaining = nextKm - currentOdometer;
      let status: 'ok' | 'warn' | 'critical' = 'ok';
      if (remaining <= 0) status = 'critical';
      else if (remaining <= 500) status = 'warn';
      return { ...it, nextKm, remaining, status };
    });
  }, [allMaintExpenses, oilChanges, maintProfile, currentOdometer]);



  // Per platform aggregates
  const byPlatform = useMemo(() => {
    const map = new Map<
      string,
      { name: string; revenue: number; km: number; ms: number }
    >();
    
    // Filter routes and dailies based on selected platform
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);
    
    const filteredDailies = selectedPlatform === 'all' 
      ? dailies 
      : dailies.filter(d => d.platform_id === selectedPlatform);

    filteredRoutes.forEach((r) => {
      const k = r.platform_id ?? '__none__';
      const cur = map.get(k) ?? { name: platformName(r.platform_id), revenue: 0, km: 0, ms: 0 };
      cur.revenue += Number(r.amount) + Number(r.tip ?? 0);
      cur.km += Number(r.distance_km ?? 0);
      
      if (r.started_at) {
        const start = new Date(r.started_at).getTime();
        const end = r.ended_at ? new Date(r.ended_at).getTime() : start;
        const effectiveStart = Math.max(start, range.since.getTime());
        const effectiveEnd = Math.min(end, range.until.getTime());
        const duration = Math.max(0, effectiveEnd - effectiveStart);
        const breakMs = (r.break_minutes ?? 0) * 60000;
        cur.ms += Math.max(0, duration - breakMs);
      }
      
      map.set(k, cur);
    });
    filteredDailies.forEach((d) => {
      const k = d.platform_id ?? '__none__';
      const cur = map.get(k) ?? { name: platformName(d.platform_id), revenue: 0, km: 0, ms: 0 };
      cur.revenue += Number(d.amount);
      cur.km += Number(d.distance_km ?? 0);
      map.set(k, cur);
    });
    
    return Array.from(map.values())
      .map((v) => ({
        name: v.name,
        receita: Number(v.revenue.toFixed(2)),
        revPerKm: v.km > 0 ? Number((v.revenue / v.km).toFixed(2)) : 0,
        revPerHour: v.ms > 0 ? Number((v.revenue / (v.ms / 3600000)).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.receita - a.receita);
  }, [routes, dailies, platforms, selectedPlatform, range.since, range.until, platformName]);

  // Categories (product type)
  const byCategory = useMemo(() => {
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);
    
    const filteredDailies = selectedPlatform === 'all' 
      ? dailies 
      : dailies.filter(d => d.platform_id === selectedPlatform);

    const map = new Map<string, number>();
    [...filteredRoutes, ...filteredDailies].forEach((route) => {
      const productType = (route as Route | DailyTotal).product_type || 'alimento';
      map.set(productType, (map.get(productType) ?? 0) + 1);
    });
    const labels: Record<string, string> = {
      alimento: 'Alimento',
      pacote: 'Pacotes',
      documento: 'Documentos',
    };
    return Array.from(map.entries()).map(([k, v]) => ({
      name: labels[k] ?? k,
      value: v,
    }));
  }, [routes, dailies, selectedPlatform, platformName]);

  // Top origins / destinations
  const topOrigins = useMemo(() => {
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);

    const map = new Map<string, number>();
    filteredRoutes.forEach((r) => {
      const v = (r.origin ?? '').trim();
      if (!v) return;
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [routes, selectedPlatform]);

  const topDestinations = useMemo(() => {
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);

    const map = new Map<string, number>();
    filteredRoutes.forEach((r) => {
      const v = (r.destination ?? '').trim();
      if (!v) return;
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [routes, selectedPlatform]);

  // Daily series (revenue, expense, profit)
  const series = useMemo(() => {
    const filteredRoutes = selectedPlatform === 'all' 
      ? routes 
      : routes.filter(r => r.platform_id === selectedPlatform);
    
    const filteredDailies = selectedPlatform === 'all' 
      ? dailies 
      : dailies.filter(d => d.platform_id === selectedPlatform);

    const since = new Date(range.since);
    since.setHours(0, 0, 0, 0);
    const until = new Date(range.until);
    const spanDays = Math.max(1, Math.ceil((until.getTime() - since.getTime()) / 86400000) + 1);
    const granularity: 'day' | 'month' =
      period === 'ano' || (period === 'custom' && spanDays > 90) ? 'month' : 'day';
    const buckets = new Map<string, { label: string; receita: number; despesa: number }>();

    const keyFor = (iso: string) => {
      const d = new Date(iso);
      if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const label = (key: string) => {
      if (granularity === 'month') {
        const [, m] = key.split('-');
        return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(m) - 1];
      }
      const [, m, d] = key.split('-');
      return `${d}/${m}`;
    };

    if (granularity === 'day') {
      for (let i = 0; i < Math.min(spanDays, 90); i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        if (d > until) break;
        const k = keyFor(d.toISOString());
        buckets.set(k, { label: label(k), receita: 0, despesa: 0 });
      }
    } else {
      const cur = new Date(since);
      cur.setDate(1);
      while (cur <= until) {
        const k = keyFor(cur.toISOString());
        buckets.set(k, { label: label(k), receita: 0, despesa: 0 });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    filteredRoutes.forEach((r) => {
      const k = keyFor(r.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.receita += Number(r.amount) + Number(r.tip ?? 0);
      buckets.set(k, b);
    });
    filteredDailies.forEach((d) => {
      const k = keyFor(d.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.receita += Number(d.amount);
      buckets.set(k, b);
    });
    expenses.forEach((e) => {
      const k = keyFor(e.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.despesa += Number(e.amount);
      buckets.set(k, b);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => ({ ...v, lucro: Number((v.receita - v.despesa).toFixed(2)) }));
  }, [routes, dailies, expenses, period, selectedPlatform, range]);

  const futureCashFlow = useMemo(() => {
    const map = new Map<string, number>();
    billingCycles.forEach(b => {
      const date = b.expected_payment_date;
      if (!date) return;
      map.set(date, (map.get(date) ?? 0) + Number(b.total_amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date,
        label: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase(),
        amount: Number(amount.toFixed(2))
      }));
  }, [billingCycles]);

  return (
    <AppShell title={'RELATÓRIOS\nINSIGHTS'}>
      <div className="space-y-4">

        {/* Time Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">FILTROS</h2>
          </div>
          
          {/* Time Filter Dropdown */}
          <div className="relative" ref={timeDropdownRef}>
            <button
              onClick={() => {
                setShowTimeDropdown(!showTimeDropdown);
                setShowPlatformDropdown(false);
              }}
              className="w-full rounded-xl bg-surface border border-border/40 p-3 flex items-center justify-between hover:bg-surface-high transition-colors"
            >
              <span className="font-semibold text-sm">
                {PERIODS.find(p => p.id === period)?.label}
              </span>
              {showTimeDropdown ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            
            {showTimeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-surface border border-border/40 shadow-lg z-10 overflow-hidden">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPeriod(p.id);
                      setShowTimeDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      period === p.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-surface-high'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform Filter Dropdown */}
          <div className="relative" ref={platformDropdownRef}>
            <button
              onClick={() => {
                setShowPlatformDropdown(!showPlatformDropdown);
                setShowTimeDropdown(false);
              }}
              className="w-full rounded-xl bg-surface border border-border/40 p-3 flex items-center justify-between hover:bg-surface-high transition-colors"
            >
              <span className="font-semibold text-sm">
                {selectedPlatform === 'all' ? 'Todas as Plataformas' : platforms.find(p => p.id === selectedPlatform)?.name || 'Todas as Plataformas'}
              </span>
              {showPlatformDropdown ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
            
            {showPlatformDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-surface border border-border/40 shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedPlatform('all');
                    setShowPlatformDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    selectedPlatform === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-surface-high'
                  }`}
                >
                  Todas as Plataformas
                </button>
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setSelectedPlatform(platform.id);
                      setShowPlatformDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      selectedPlatform === platform.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-surface-high'
                    }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Period selector - hidden as it's now in dropdown */}
        {/* <div className="rounded-xl bg-surface border border-border/40 p-1.5 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition text-center ${
                period === p.id
                  ? 'bg-primary text-primary-foreground shadow-fab'
                  : 'bg-surface-high text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div> */}

        {period === 'custom' && (
          <div className="rounded-xl bg-surface border border-border/40 p-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              De
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-surface-high border border-transparent focus:border-primary outline-none text-foreground text-sm normal-case font-normal"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Até
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayISO()}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-surface-high border border-transparent focus:border-primary outline-none text-foreground text-sm normal-case font-normal"
              />
            </label>
          </div>
        )}
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            Icon={Banknote}
            label="Receita Bruta"
            value={formatBRL(stats.totalRevenue)}
            tone="primary"
          />
          <Kpi
            Icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
            label="Lucro Líquido"
            value={formatBRL(stats.profit)}
            tone={stats.profit >= 0 ? 'success' : 'destructive'}
          />
          <Kpi Icon={TrendingUp} label="Lucro / KM" value={formatBRL(stats.profitPerKm)} tone="success" />
          <Kpi Icon={TrendingUp} label="Lucro / Hora" value={formatBRL(stats.profitPerHour)} tone="success" />
          <Kpi Icon={Gauge} label="Receita / KM" value={formatBRL(stats.revPerKm)} />
          <Kpi Icon={Clock} label="Receita / Hora" value={formatBRL(stats.revPerHour)} />
          <Kpi Icon={RouteIcon} label="KM rodados" value={formatKm(stats.totalKm)} />
          <Kpi Icon={Clock} label="Horas trab." value={formatHours(stats.hours * 3600000)} />
          <Kpi
            Icon={TrendingDown}
            label="Custo Op. / KM"
            value={formatBRL(stats.costPerKm)}
            tone="destructive"
            hint="Custo operacional total (todas as despesas do período) dividido pela quilometragem total percorrida no mesmo período."
          />
          <Kpi
            Icon={Gauge}
            label="Consumo Real (km/L)"
            value={realConsumption > 0 ? `${realConsumption.toFixed(1)} km/L` : '—'}
            hint="Calculado dinamicamente: KM rodados no período ÷ litros abastecidos (despesas de combustível no período)."
          />

          <Kpi Icon={MapPin} label="Rotas" value={String(stats.routeCount)} />
          <Kpi Icon={Package} label="Pacotes Totais" value={String(stats.totalPackages)} />
          <Kpi Icon={Package} label="Pacotinhos" value={String(stats.totalSmallPackages)} />
          <Kpi Icon={Banknote} label="Valor Pacotinhos" value={formatBRL(stats.smallPackagesValue)} tone="primary" />
          <Kpi Icon={Package} label="Volumosos" value={String(stats.totalLargePackages)} />
          <Kpi Icon={Banknote} label="Valor Volumosos" value={formatBRL(stats.largePackagesValue)} tone="primary" />
        </div>

        {/* Maintenance costs (period) */}
        <Section title="CUSTOS DE MANUTENÇÃO (PERÍODO)">
          {maintCostBreakdown.total === 0 ? (
            <Empty hint="Sem despesas de combustível ou manutenção no período." />
          ) : (
            <>
              {(() => {
                const sinceISO = range.since.toISOString();
                const untilISO = range.until.toISOString();
                const goCat = (cat: 'combustivel' | 'oleo' | 'pecas') =>
                  navigate(`/historico?cat=${cat}&since=${encodeURIComponent(sinceISO)}&until=${encodeURIComponent(untilISO)}`);
                const pieData = [
                  { key: 'combustivel' as const, name: 'Combustível', value: Number(maintCostBreakdown.fuel.toFixed(2)) },
                  { key: 'oleo' as const, name: 'Óleo / Filtros', value: Number(maintCostBreakdown.oil.toFixed(2)) },
                  { key: 'pecas' as const, name: 'Peças / Outros', value: Number(maintCostBreakdown.parts.toFixed(2)) },
                ].filter((d) => d.value > 0);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Kpi Icon={Fuel} label="Combustível" value={formatBRL(maintCostBreakdown.fuel)} tone="primary" onClick={() => goCat('combustivel')} hint="Ver despesas de combustível no período" />
                      <Kpi Icon={Droplet} label="Óleo / Filtros" value={formatBRL(maintCostBreakdown.oil)} tone="info" onClick={() => goCat('oleo')} hint="Ver despesas de óleo/filtros no período" />
                      <Kpi Icon={Wrench} label="Peças / Outros" value={formatBRL(maintCostBreakdown.parts)} tone="destructive" onClick={() => goCat('pecas')} hint="Ver despesas de peças/outros no período" />
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={36}
                            outerRadius={64}
                            strokeWidth={0}
                            onClick={(_, idx) => {
                              const d = pieData[idx];
                              if (d) goCat(d.key);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1E1E1E',
                              border: '1px solid #353534',
                              borderRadius: 12,
                              fontSize: 12,
                              color: '#e5e2e1',
                            }}
                            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                            itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                            formatter={(v: number) => formatBRL(v)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground text-center">Toque em um card ou fatia para ver as despesas filtradas.</p>
                  </>
                );
              })()}
            </>
          )}
        </Section>

        {/* Preventive maintenance schedule */}
        <Section title="MANUTENÇÃO PREVENTIVA">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Odômetro estimado</span>
            <span className="font-bold text-foreground">{formatKm(currentOdometer)}</span>
          </div>
          <ul className="space-y-2">
            {maintSchedule.map((it) => {
              const toneBg =
                it.status === 'critical'
                  ? 'bg-destructive/15 border-destructive/40'
                  : it.status === 'warn'
                  ? 'bg-warning/15 border-warning/40'
                  : 'bg-success/10 border-success/30';
              const toneText =
                it.status === 'critical'
                  ? 'text-destructive'
                  : it.status === 'warn'
                  ? 'text-warning'
                  : 'text-success';
              const StatusIcon =
                it.status === 'critical' ? AlertTriangle : it.status === 'warn' ? AlertTriangle : CheckCircle2;
              const statusLabel =
                it.status === 'critical' ? 'Atrasado' : it.status === 'warn' ? 'Atenção' : 'OK';
              return (
                <li
                  key={it.name}
                  className={`rounded-xl border p-3 ${toneBg}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{it.name}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${toneText}`}>
                      <StatusIcon className="size-3.5" />
                      {statusLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <p className="uppercase">Última</p>
                      <p className="font-semibold text-foreground">
                        {it.lastKm != null ? formatKm(it.lastKm) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase">Próxima</p>
                      <p className="font-semibold text-foreground">{formatKm(it.nextKm)}</p>
                    </div>
                    <div>
                      <p className="uppercase">Restante</p>
                      <p className={`font-bold ${toneText}`}>
                        {it.remaining <= 0 ? `-${formatKm(Math.abs(it.remaining))}` : formatKm(it.remaining)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Revenue x Expense x Profit timeline */}

        <Section title="DESEMPENHO NO PERÍODO">
          {series.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#111827',
                    }}
                    labelStyle={{ color: '#111827' }}
                    itemStyle={{ color: '#111827' }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="hsl(48 100% 50%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lucro" name="Lucro Líq." stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* Future Cash Flow */}
        <Section title="FLUXO DE CAIXA FUTURO (FATURAS A RECEBER)">
          {futureCashFlow.length === 0 ? (
            <Empty hint="Nenhuma fatura em aberto com data de pagamento futura." />
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={futureCashFlow} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #353534',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#e5e2e1',
                      }}
                      labelStyle={{ color: '#ffb599', fontWeight: 'bold', marginBottom: 4 }}
                      itemStyle={{ color: '#e5e2e1' }}
                      label="Projeção"
                      formatter={(v: number) => formatBRL(v)}
                      cursor={{ fill: 'rgba(255, 181, 153, 0.1)' }}
                    />
                    <Bar dataKey="amount" name="A Receber" radius={[4, 4, 0, 0]} fill="hsl(21 100% 60%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 bg-primary/10 rounded-xl p-3 flex items-center justify-between border border-primary/20">
                <span className="text-sm font-bold text-primary">TOTAL PROJETADO</span>
                <span className="display text-xl text-primary">{formatBRL(futureCashFlow.reduce((s, c) => s + c.amount, 0))}</span>
              </div>
            </>
          )}
        </Section>

        {/* Per platform */}
        <Section title="POR PLATAFORMA (RENTABILIDADE)">
          {byPlatform.length === 0 ? (
            <Empty hint="Cadastre plataformas e lance rotas." />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPlatform.sort((a,b) => b.revPerHour - a.revPerHour)} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E1E1E',
                        border: '1px solid #353534',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#e5e2e1',
                      }}
                      labelStyle={{ color: '#ffb599', fontWeight: 'bold', marginBottom: 4 }}
                      itemStyle={{ color: '#e5e2e1' }}
                      label="Rentabilidade"
                      formatter={(v: number) => formatBRL(v) + '/hora'}
                      cursor={{ fill: 'rgba(255, 181, 153, 0.1)' }}
                    />
                    <Bar dataKey="revPerHour" name="R$ / Hora" radius={[0, 4, 4, 0]}>
                      {byPlatform.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 divide-y divide-border/40">
                {byPlatform.sort((a,b) => b.revPerHour - a.revPerHour).map((p, i) => (
                  <li key={p.name} className="py-2 flex items-center gap-3">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Receita Bruta: {formatBRL(p.receita)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-bold text-sm">{formatBRL(p.revPerHour)}/h</span>
                      <p className="text-[11px] text-muted-foreground">{formatBRL(p.revPerKm)}/km</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        {/* Categories */}
        <Section title="CATEGORIAS ENTREGUES">
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={36}
                      outerRadius={64}
                      strokeWidth={0}
                    >
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#111827',
                      }}
                      labelStyle={{ color: '#111827' }}
                      itemStyle={{ color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {byCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm font-semibold flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Origins / Destinations */}
        <div className="grid grid-cols-1 gap-3">
          <PlacesCard title="TOP ORIGENS" items={topOrigins} icon={<MapPin className="size-4" />} />
          <PlacesCard title="TOP DESTINOS" items={topDestinations} icon={<MapPin className="size-4" />} />
        </div>

        {loading && (
          <p className="text-center text-xs text-muted-foreground py-4">Carregando insights…</p>
        )}
      </div>
    </AppShell>
  );
};

const Kpi = ({
  Icon,
  label,
  value,
  tone = 'foreground',
  hint,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'destructive' | 'accent' | 'info' | 'foreground';
  hint?: string;
  onClick?: () => void;
}) => {
  const toneCls: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    destructive: 'text-destructive',
    accent: 'text-accent',
    info: 'text-info',
    foreground: 'text-foreground',
  };
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-xl bg-surface border border-border/40 p-3 shadow-card ${onClick ? 'transition hover:border-primary/40 hover:bg-surface-high active:scale-[0.98] cursor-pointer' : ''}`}
      title={hint}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`size-4 ${toneCls[tone]}`} />
        <span className="label-up text-[10px] text-muted-foreground flex items-center gap-1">
          {label}
          {hint && (
            <span
              className="inline-flex items-center justify-center size-3.5 rounded-full bg-surface-high text-[9px] font-bold text-muted-foreground cursor-help"
              aria-label={hint}
            >
              ?
            </span>
          )}
        </span>
      </div>
      <p className={`display text-xl ${toneCls[tone]}`}>{value}</p>
    </Tag>
  );
};


const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-surface border border-border/40 p-4 shadow-card">
    <h3 className="display text-base mb-3">{title}</h3>
    {children}
  </section>
);

const Empty = ({ hint = 'Sem dados no período.' }: { hint?: string }) => (
  <p className="text-sm text-muted-foreground text-center py-6">{hint}</p>
);

const PlacesCard = ({
  title,
  items,
  icon,
}: {
  title: string;
  items: { name: string; value: number }[];
  icon: React.ReactNode;
}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <Empty hint="Lance rotas com origem/destino." />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.name}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{icon}</span>
                <span className="text-sm font-semibold flex-1 truncate">{it.name}</span>
                <span className="text-xs text-muted-foreground">{it.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-bright overflow-hidden">
                <div
                  className="h-full bg-gradient-primary"
                  style={{ width: `${(it.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

export default Relatorios;
