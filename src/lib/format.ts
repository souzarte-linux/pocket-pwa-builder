export const formatBRL = (value: number | null | undefined) => {
  const v = Number(value ?? 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatKm = (value: number | null | undefined) => {
  const v = Number(value ?? 0);
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`;
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const todayBoundaries = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const startOfWeek = (date: Date = new Date()) => {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export const relativeFromNow = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m atrás`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
};

export const formatHours = (ms: number) => {
  const h = ms / 3600000;
  return `${h.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
};

export const getDaysInRange = (since: Date, until: Date) => {
  const start = new Date(since);
  start.setHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setHours(23, 59, 59, 999);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
};

export const getRouteInitialKmValue = (lastKnownKm: number | null | undefined) => {
  if (typeof lastKnownKm === 'number' && Number.isFinite(lastKnownKm)) {
    return String(lastKnownKm);
  }
  return '';
};

export const toLocalInput = (dateOrStr: Date | string | null | undefined): string => {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Live currency mask (centavos typing style: e.g. "12550" -> "R$ 125,50") */
export const parseCurrencyInput = (val: string): { display: string; numeric: number } => {
  const cleanDigits = val.replace(/\D/g, '');
  if (!cleanDigits) return { display: '', numeric: 0 };
  const numeric = Number(cleanDigits) / 100;
  const display = formatBRL(numeric);
  return { display, numeric };
};

/** Phone number mask (00) 0.0000-0000 */
export const formatPhoneMask = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}.${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}.${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/** Unformat phone number to contain numbers only (digits without mask) */
export const unformatPhone = (val: string): string => {
  return val.replace(/\D/g, '');
};


/** CEP mask 00000-000 */
export const formatCepMask = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/** CNPJ mask 00.000.000/0000-00 */
export const formatCnpjMask = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

/** Brazilian CNPJ Checksum Validation Algorithm */
export const validateCNPJ = (cnpjStr: string): boolean => {
  const cnpj = cnpjStr.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(1))) return false;

  return true;
};




