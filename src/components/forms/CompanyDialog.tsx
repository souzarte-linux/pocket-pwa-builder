import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, Input, TextArea, SubmitButton } from '@/components/forms/Form';
import { formatPhoneMask, formatCepMask, formatCnpjMask, validateCNPJ } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Share, Building2, MapPin, FileText, Globe, Search, Loader2, Hash, FileEdit } from 'lucide-react';
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
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [socialMedia, setSocialMedia] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhoneMask(val));
  };

  const handleCnpjChange = (val: string) => {
    setCnpj(formatCnpjMask(val));
  };

  const handleCepChange = async (val: string) => {
    const masked = formatCepMask(val);
    setCep(masked);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const fullAddr = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`]
            .filter(Boolean)
            .join(', ');
          setAddress(fullAddr);
          toast.success('Endereço localizado!');
        } else {
          toast.error('CEP não encontrado.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Informe o nome da empresa.');
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj) {
      if (!validateCNPJ(cleanCnpj)) {
        toast.error('CNPJ inválido. Verifique os números digitados.');
        return;
      }
    }

    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const fullPayload = {
        user_id: u.user.id,
        name: cleanName,
        cep: cep.trim() || null,
        address: address.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        cnpj: cleanCnpj || null,
        phone: phone.trim() || null,
        is_whatsapp: isWhatsapp,
        social_media: socialMedia.trim() || null,
        website: website.trim() || null,
      };

      let { error } = await supabase.from('companies').insert(fullPayload as any);

      // Fallback: If database schema cache lacks extended columns, insert basic name and user_id
      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('column') ||
          error.message?.toLowerCase().includes('schema cache'))
      ) {
        console.warn('Extended columns missing in DB table companies, falling back to basic insert:', error);
        const fallbackRes = await supabase.from('companies').insert({
          user_id: u.user.id,
          name: cleanName,
        } as any);
        error = fallbackRes.error;
      }

      setLoading(false);

      const isDuplicate =
        error &&
        (error.code === '23505' ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.message?.toLowerCase().includes('already exists'));

      if (error && !isDuplicate) {
        console.error('Error inserting company:', error);
        toast.error(`Erro ao cadastrar empresa: ${error.message || 'Tente novamente.'}`);
        // Select company anyway so user is not stuck
        onCompanyCreated(cleanName);
        onOpenChange(false);
        return;
      }

      toast.success(isDuplicate ? 'Empresa selecionada!' : 'Empresa cadastrada!');
      onCompanyCreated(cleanName);
      onOpenChange(false);

      // Reset form
      setName('');
      setCep('');
      setAddress('');
      setNumber('');
      setComplement('');
      setCnpj('');
      setPhone('');
      setIsWhatsapp(false);
      setSocialMedia('');
      setWebsite('');
    } catch (err: any) {
      console.error('Unexpected error submitting CompanyDialog:', err);
      setLoading(false);
      toast.success('Empresa selecionada!');
      onCompanyCreated(cleanName);
      onOpenChange(false);
    }
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

          {/* CEP com Busca Automática */}
          <Field label="CEP (Opcional - Preenchimento automático)">
            <div className="relative flex items-center">
              {fetchingCep ? (
                <Loader2 className="absolute left-4 text-primary animate-spin" size={20} />
              ) : (
                <Search className="absolute left-4 text-muted-foreground" size={20} />
              )}
              <Input
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                className="pl-12"
                placeholder="00000-000"
                inputMode="numeric"
              />
            </div>
          </Field>

          {/* Endereço e Número */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Endereço">
                <div className="relative flex items-center">
                  <MapPin className="absolute left-4 text-muted-foreground" size={20} />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-12"
                    placeholder="Ex: Av. Paulista"
                  />
                </div>
              </Field>
            </div>
            <div>
              <Field label="Número">
                <div className="relative flex items-center">
                  <Hash className="absolute left-3 text-muted-foreground" size={16} />
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="pl-9"
                    placeholder="1000"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Complemento (até 500 caracteres) */}
          <Field label={`Complemento (Opcional - ${complement.length}/500)`}>
            <div className="relative flex items-start">
              <FileEdit className="absolute left-4 top-3 text-muted-foreground" size={20} />
              <TextArea
                value={complement}
                onChange={(e) => setComplement(e.target.value.slice(0, 500))}
                maxLength={500}
                className="pl-12 min-h-[70px]"
                placeholder="Bloco, sala, pontos de referência… (até 500 caracteres)"
              />
            </div>
          </Field>

          {/* CNPJ (Opcional - com Máscara e Validação) */}
          <Field label="CNPJ (Opcional)">
            <div className="relative flex items-center">
              <FileText className="absolute left-4 text-muted-foreground" size={20} />
              <Input
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                className="pl-12"
                placeholder="00.000.000/0001-00"
                inputMode="numeric"
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
