import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image, User, Smartphone, Mail, User2, Share, Bike, MapPin, Lock, ShieldCheck, CheckCircle, HelpCircle, RotateCcw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CadastroMotorista = () => {
  const navigate = useNavigate();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    celular: '',
    whatsapp: false,
    redeSocial: '',
    veiculo: 'moto',
    placa: '',
    senha: '',
    confirmarSenha: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageSelect = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      galleryInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      setCameraStream(stream);
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      galleryInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    // Stop current stream
    cameraStream?.getTracks().forEach(track => track.stop());
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode }, audio: false });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      // If switching fails, try to go back to the original
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (fallbackError) {
        stopCamera();
      }
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setProfileImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleImageSelect(file || null);
  };

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration data:', formData);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      {/* Header */}
      <header className="bg-primary-container text-on-primary-container font-black uppercase tracking-tighter fixed top-0 w-full border-b-2 border-primary-container/20 flex justify-between items-center px-5 h-20 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth')}
            className="hover:bg-primary-container/20 transition-colors active:scale-95 p-2 rounded-full text-on-primary-container"
          >
            <ArrowLeft className="text-2xl" />
          </Button>
          <h1 className="text-xl font-headline-xl">CADASTRO MOTORISTA</h1>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="pt-24 pb-28 px-margin-main max-w-md mx-auto">
        {/* Profile Picture Section */}
        <section className="mb-stack-lg text-center relative">
          {/* Decorative background elements */}
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary-container/20 rounded-full blur-lg"></div>

          <div className="relative inline-block group">
            <div className="w-32 h-32 rounded-full border-4 border-primary-container overflow-hidden bg-surface-container-high flex items-center justify-center shadow-2xl shadow-primary-container/30">
              {profileImage ? (
                <img
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  src={profileImage}
                />
              ) : (
                <img
                  alt="Avatar"
                  className="w-full h-full object-cover opacity-60"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
                />
              )}
              <div className="absolute inset-0 bg-primary-container/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="text-on-primary-container text-4xl" />
              </div>
            </div>
            {/* Status indicator */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-container rounded-full border-4 border-background flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-on-primary-container" />
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={handleCameraClick}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center border-2 border-primary-container/50 group-active:border-primary-container transition-all shadow-lg shadow-primary-container/30">
                <Camera className="text-on-primary-container text-xl" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-primary-container font-semibold">Câmera</span>
            </button>
            <button
              type="button"
              onClick={handleGalleryClick}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center border-2 border-primary-container/50 group-active:border-primary-container transition-all shadow-lg shadow-primary-container/30">
                <Image className="text-on-primary-container text-xl" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-primary-container font-semibold">Galeria</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center border-2 border-primary-container/50 group-active:border-primary-container transition-all shadow-lg shadow-primary-container/30">
                <User className="text-on-primary-container text-xl" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-primary-container font-semibold">Avatares</span>
            </button>
          </div>

          {/* Hidden gallery input */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </section>

        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
            <div className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-primary-container bg-surface p-4">
              <video ref={videoRef} className="w-full h-[360px] bg-black" playsInline muted />
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="flex-1 rounded-xl bg-primary-container text-on-primary-container py-3 font-semibold transition hover:bg-primary/90"
                >
                  Capturar
                </button>
                <button
                  type="button"
                  onClick={switchCamera}
                  className="px-4 rounded-xl border border-primary-container text-primary-container py-3 font-semibold transition hover:bg-primary-container/10"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 rounded-xl border border-primary-container text-primary-container py-3 font-semibold transition hover:bg-primary-container/10"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
          {/* Nome Completo */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Nome Completo</label>
            <div className="relative flex items-center">
              <User2 className="absolute left-4 text-primary-container" size={20} />
              <input
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                placeholder="EX: JOÃO DA SILVA"
                type="text"
                required
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">E-mail</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-primary-container" size={20} />
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                placeholder="EXEMPLO@EMAIL.COM"
                type="email"
                required
              />
            </div>
          </div>

          {/* Celular + WhatsApp */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Celular</label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <MessageCircle className="absolute left-4 text-[#25D366]" size={20} />
                <input
                  name="celular"
                  value={formData.celular}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                  placeholder="(00) 00000-0000"
                  type="tel"
                  required
                />
              </div>
              <label className="flex items-center gap-2 bg-surface-container border-2 border-primary-container/30 px-3 cursor-pointer hover:bg-primary-container/10 transition-colors rounded-lg">
                <input
                  name="whatsapp"
                  checked={formData.whatsapp}
                  onChange={handleInputChange}
                  className="w-5 h-5 accent-primary-container"
                  type="checkbox"
                />
                <span className="text-green-500 text-lg">📱</span>
              </label>
            </div>
          </div>

          {/* Rede Social */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Rede Social (Opcional)</label>
            <div className="relative flex items-center">
              <Share className="absolute left-4 text-primary-container" size={20} />
              <input
                name="redeSocial"
                value={formData.redeSocial}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                placeholder="@SEUUSUARIO"
                type="text"
              />
            </div>
          </div>

          {/* Veículo Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Veículo</label>
              <div className="relative flex items-center">
                <Bike className="absolute left-4 text-primary-container" size={20} />
                <select
                  name="veiculo"
                  value={formData.veiculo}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface appearance-none transition-all rounded-lg"
                >
                  <option value="moto">Moto</option>
                  <option value="carro">Carro</option>
                  <option value="bike">Bike</option>
                </select>
                <div className="absolute right-4 text-primary-container pointer-events-none">
                  ▼
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Placa</label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-4 text-primary-container" size={20} />
                <input
                  name="placa"
                  value={formData.placa}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg uppercase"
                  placeholder="ABC-1234"
                  type="text"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-primary-container hover:text-primary transition-colors"
              onClick={() => navigate('/configuracoes')}
            >
              <span className="font-label-md text-[10px] uppercase tracking-wider">Configurações Detalhadas</span>
              <span className="material-symbols-outlined text-sm">settings</span>
            </Button>
          </div>

          {/* Senhas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-primary-container" size={20} />
                <input
                  name="senha"
                  value={formData.senha}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                  placeholder="********"
                  type="password"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-primary-container uppercase text-[10px] ml-1 font-semibold">Confirmar Senha</label>
              <div className="relative flex items-center">
                <ShieldCheck className="absolute left-4 text-primary-container" size={20} />
                <input
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-primary-container/30 focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-all rounded-lg"
                  placeholder="********"
                  type="password"
                  required
                />
              </div>
            </div>
          </div>

          {/* Botão Finalizar */}
          <Button
            type="submit"
            className="mt-4 h-16 font-headline-md uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <span>FINALIZAR CADASTRO</span>
            <CheckCircle size={24} />
          </Button>
        </form>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 bg-zinc-950 px-4 pb-safe border-t-2 border-zinc-800">
        <button
          onClick={() => navigate('/auth')}
          className="flex flex-col items-center justify-center text-on-surface-variant pt-2 pb-safe hover:text-on-surface transition-all active:bg-zinc-900 group"
        >
          <ArrowLeft className="text-2xl" />
          <span className="font-bold text-[12px] uppercase">Voltar</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant pt-2 pb-safe hover:text-on-surface transition-all active:bg-zinc-900 group">
          <HelpCircle className="text-2xl" />
          <span className="font-bold text-[12px] uppercase">Ajuda</span>
        </button>
      </nav>

      {/* Bottom Aesthetic Bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50"></div>
    </div>
  );
};

export default CadastroMotorista;