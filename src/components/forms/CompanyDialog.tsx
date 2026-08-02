import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, Input, SubmitButton } from '@/components/forms/Form';
import { formatPhoneMask } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Share, Building2, MapPin, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyCreated: (name: string) => void;
}

export const CompanyDialog: React.FC<CompanyDialogProps> = ({
  open,
  onOpenChange,
  onCompanyCreated,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [socialMedia, setSocialMedia] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhoneMask(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error('Usuário não autenticado.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('companies').insert({
      user_id: u.user.id,
      name: name.trim(),
      address: address.trim() || null,
      cnpj: cnpj.trim() || null,
      phone: phone.trim() || null,
      is_whatsapp: isWhatsapp,
      social_media: socialMedia.trim() || null,
      website: website.trim() || null,
    });

    setLoading(false);

    if (error && !error.message.includes('duplicate')) {
      console.error(error);
      toast.error('Erro ao cadastrar empresa. Tente novamente.');
      return;
    }

    toast.success('Empresa cadastrada!');
    onCompanyCreated(name.trim());
    onOpenChange(false);

    // Reset form
    setName('');
    setAddress('');
    setCnpj('');
    setPhone('');
    setIsWhatsapp(false);
    setSocialMedia('');
    setWebsite('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface border border-border/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle className="display text-xl text-primary flex items-center gap-2 uppercase">
            <Building2 className="size-6 text-primary" />
            Cadastrar Nova Empresa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nome da Empresa (Obrigatório) */}
          <Field label="Nome da Empresa *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="EX: AUTO PEÇAS SILVA"
              required
              autoFocus
            />
          </Field>

          {/* Endereço (Opcional) */}
          <Field label="Endereço (Opcional)">
            <div className="relative flex items-center">
              <MapPin className="absolute left-4 text-muted-foreground" size={20} />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-12"
                placeholder="Ex: Av. Paulista, 1000"
              />
            </div>
          </Field>

          {/* CNPJ (Opcional) */}
          <Field label="CNPJ (Opcional)">
            <div className="relative flex items-center">
              <FileText className="absolute left-4 text-muted-foreground" size={20} />
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="pl-12"
                placeholder="00.000.000/0001-00"
              />
            </div>
          </Field>

          {/* Celular + WhatsApp (Opcional) */}
          <div className="flex flex-col gap-1">
            <label className="block label-up text-xs text-muted-foreground mb-1">
              Contato / Celular (Opcional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(00) 00000-0000"
                  type="tel"
                />
              </div>
              <label className="flex items-center gap-2 bg-surface-high border-2 border-transparent px-3 cursor-pointer hover:bg-surface-highest transition-colors rounded-lg h-14 shrink-0">
                <input
                  type="checkbox"
                  checked={isWhatsapp}
                  onChange={(e) => setIsWhatsapp(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <MessageCircle size={20} className="text-[#25D366]" />
                <span className="text-[12px] font-bold text-foreground uppercase">WhatsApp</span>
              </label>
            </div>
          </div>

          {/* Rede Social (Opcional) */}
          <Field label="Rede Social (Opcional)">
            <div className="relative flex items-center">
              <Share className="absolute left-4 text-muted-foreground" size={20} />
              <Input
                value={socialMedia}
                onChange={(e) => setSocialMedia(e.target.value)}
                className="pl-12"
                placeholder="@SUAEMPRESA"
              />
            </div>
          </Field>

          {/* Site (Opcional) */}
          <Field label="Site (Opcional)">
            <div className="relative flex items-center">
              <Globe className="absolute left-4 text-muted-foreground" size={20} />
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="pl-12"
                placeholder="https://empresa.com.br"
                type="url"
              />
            </div>
          </Field>

          <DialogFooter className="gap-2 pt-3 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 px-4 rounded-lg bg-surface-high font-bold text-sm text-muted-foreground hover:bg-surface-highest transition"
            >
              CANCELAR
            </button>
            <SubmitButton loading={loading}>CADASTRAR EMPRESA</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
