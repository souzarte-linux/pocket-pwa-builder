import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bikeBg from '@/assets/login-bike.jpg';

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success('Conta criada! Bem-vindo, motorista 🏍️');
        navigate('/', { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Acelerando…');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Erro inesperado';
      const friendly = msg.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : msg.includes('already registered')
        ? 'Este e-mail já está cadastrado. Faça login.'
        : msg;
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen relative overflow-hidden">
      {/* Hero image */}
      <div className="absolute inset-x-0 top-0 h-[42vh] -z-0">
        <img
          src={bikeBg}
          alt="Moto"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="relative z-10 px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="display text-5xl text-primary tracking-tight">DRIVER HUB</h1>
          <p className="mt-2 text-foreground font-semibold">
            {mode === 'login' ? 'Bem-vindo de volta, motorista!' : 'Crie sua conta de motorista'}
          </p>
        </motion.div>

        <form onSubmit={submit} className="mt-10 space-y-5">
          {mode === 'signup' && (
            <Field label="Nome completo" icon={<UserIcon className="size-5" />}>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
                className="input-base"
              />
            </Field>
          )}

          <Field label="E-mail" icon={<Mail className="size-5" />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="motorista@logica.com"
              required
              autoComplete="email"
              className="input-base"
            />
          </Field>

          <Field label="Senha" icon={<Lock className="size-5" />}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="input-base pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? 'AGUARDE…' : mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
            <LogIn className="size-5" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'Não tem uma conta? ' : 'Já tem conta? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-primary font-bold"
          >
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>

      <style>{`
        .input-base {
          width: 100%;
          height: 56px;
          padding-left: 48px;
          padding-right: 16px;
          background: hsl(var(--surface-high));
          border: 1px solid transparent;
          border-radius: 16px;
          color: hsl(var(--foreground));
          font-size: 16px;
          outline: none;
          transition: var(--transition-base);
        }
        .input-base:focus { border-color: hsl(var(--primary)); }
        .input-base::placeholder { color: hsl(var(--muted-foreground) / 0.7); }
      `}</style>
    </div>
  );
};

const Field = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-sm font-bold mb-2">{label}</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
    </div>
  </div>
);

export default Auth;
