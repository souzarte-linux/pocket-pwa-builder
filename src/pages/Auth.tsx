import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, User, Lock, Apple, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Acelerando…');
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? 'Erro inesperado';
      const friendly = msg.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : msg;
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setOauthLoading('google');
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        toast.success('Login com Google realizado com sucesso.');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      toast.error('Erro ao fazer login com Google: ' + (err?.message ?? String(err)));
    } finally {
      setOauthLoading(null);
    }
  };

  const signInWithApple = async () => {
    setOauthLoading('apple');
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        toast.success('Login com Apple realizado com sucesso.');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      toast.error('Erro ao fazer login com Apple: ' + (err?.message ?? String(err)));
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col selection:bg-primary-container selection:text-white dark">
      {/* Hero Brand Section */}
      <header className="relative h-[309px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Motorcycle headlight in the dark"
            className="w-full h-full object-cover opacity-40 grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtq3wpdjLV9vP9YFvP-Cx8NVCw6XacAt1ULFOg7J7NZj2P2LrwmOAKjG0LEhC-QwIMFiTslxbasoh9_4lTBX4GrtIKz6GFFIJ36yBhnVNyJ2NoovFLi1j1h2BRWhPjMIp8YzzMDvG70nWCZ9ihxe7NBvXlEMWMU0CpQuhmYD0GU5VevBSDhNB0zdDE-AYnLkpzNihPRCRRXgffuZiDHpn9chuE83CqrOo4Ehr63QQRuaNE5S9-DALE4Tp5dIcTFVbozW9bXR7nLUM"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
        </div>
        <div className="relative z-10 text-center px-margin-main">
          <h1 className="font-headline-xl text-headline-xl italic text-primary-container tracking-tighter uppercase mb-stack-sm">
            DRIVER HUB
          </h1>
          <p className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Bem-vindo de volta, motorista!
          </p>
        </div>
      </header>
      {/* Login Form Section */}
      <main className="flex-grow px-margin-main -mt-stack-lg relative z-20">
        <div className="max-w-md mx-auto">
          <form action="#" className="space-y-stack-md" method="POST" onSubmit={submit}>
            {/* Email Field */}
            <div className="space-y-unit">
              <label className="font-label-md text-label-md text-on-surface-variant ml-unit" htmlFor="login">E-mail ou Usuário</label>
              <div className="relative flex items-center bg-surface-container-high border-2 border-surface-variant rounded-lg overflow-hidden h-touch-target-min transition-all focus-within:border-primary-container">
                <User className="px-stack-md text-outline" size={24} />
                <input
                  className="bg-transparent border-none focus:ring-0 w-full text-on-surface font-body-md placeholder:text-outline/50"
                  id="login"
                  name="login"
                  placeholder="motorista@logica.com"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {/* Password Field */}
            <div className="space-y-unit">
              <label className="font-label-md text-label-md text-on-surface-variant ml-unit" htmlFor="password">Senha</label>
              <div className="relative flex items-center bg-surface-container-high border-2 border-surface-variant rounded-lg overflow-hidden h-touch-target-min transition-all focus-within:border-primary-container">
                <Lock className="px-stack-md text-outline" size={24} />
                <input
                  className="bg-transparent border-none focus:ring-0 w-full text-on-surface font-body-md placeholder:text-outline/50"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="px-stack-md text-outline hover:text-primary-container transition-colors"
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>
            {/* Additional Options */}
            <div className="flex items-center justify-between pt-unit">
              <label className="flex items-center space-x-stack-sm cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    className="peer appearance-none w-6 h-6 border-2 border-surface-variant rounded bg-surface-container-highest checked:bg-primary-container checked:border-primary-container transition-all"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="material-symbols-outlined absolute text-primary-foreground opacity-0 peer-checked:opacity-100 left-0 right-0 text-center text-sm pointer-events-none">check</span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">Lembrar de mim</span>
              </label>
              <a className="font-label-md text-label-md text-primary hover:underline decoration-2 underline-offset-4 transition-all" href="#">Esqueceu a senha?</a>
            </div>
            {/* Action Button */}
            <button
              className="w-full h-touch-target-min bg-primary text-primary-foreground rounded-lg font-label-xl text-label-xl flex items-center justify-center space-x-stack-sm active:scale-[0.98] transition-transform shadow-[0_4px_0_0_#7f2b00] hover:shadow-[0_2px_0_0_#7f2b00] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'AGUARDE…' : 'ENTRAR'}</span>
              <LogIn size={24} />
            </button>
          </form>
          {/* Social Login Separator */}
          <div className="my-stack-lg flex items-center space-x-stack-md">
            <div className="h-[2px] flex-grow bg-surface-container-highest"></div>
            <span className="font-label-md text-label-md text-outline uppercase tracking-widest">ou entre com</span>
            <div className="h-[2px] flex-grow bg-surface-container-highest"></div>
          </div>
          {/* Social Buttons Grid */}
          <div className="grid grid-cols-2 gap-stack-md">
            <button
              onClick={signInWithGoogle}
              disabled={oauthLoading !== null}
              aria-busy={oauthLoading === 'google'}
              className="h-touch-target-min border-2 border-surface-variant rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-center justify-center space-x-stack-sm group disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <span
                  className="font-bold"
                  style={{
                    fontSize: '18px',
                    background: 'linear-gradient(90deg, #4285F4 0%, #34A853 33%, #FBBC05 66%, #EA4335 100%)',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  G
                </span>
              </div>
              <span className="font-label-md text-label-md flex items-center gap-2" aria-live="polite" aria-atomic="true">
                {oauthLoading === 'google' && <Loader2 className="animate-spin" size={18} />}
                {oauthLoading === 'google' ? 'Entrando...' : 'Google'}
              </span>
            </button>
            <button
              onClick={signInWithApple}
              disabled={oauthLoading !== null}
              aria-busy={oauthLoading === 'apple'}
              className="h-touch-target-min border-2 border-surface-variant rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-center justify-center space-x-stack-sm group disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Apple className="text-2xl" />
              <span className="font-label-md text-label-md flex items-center gap-2" aria-live="polite" aria-atomic="true">
                {oauthLoading === 'apple' && <Loader2 className="animate-spin" size={18} />}
                {oauthLoading === 'apple' ? 'Entrando...' : 'Apple'}
              </span>
            </button>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="mt-auto py-stack-lg text-center px-margin-main">
        <p className="font-body-md text-on-surface-variant">
          Não tem uma conta?
          <a className="text-primary-container font-label-md hover:underline decoration-2 underline-offset-4 ml-unit" href="#">Cadastre-se</a>
        </p>
      </footer>
      {/* Bottom Aesthetic Bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50"></div>
    </div>
  );
};

export default Auth;
