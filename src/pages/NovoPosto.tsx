import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fuelTypesList = [
  'Etanol',
  'Gasolina Comum',
  'Gasolina Aditivada',
  'GNV',
  'Diesel',
];

const NovoPosto = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleFuel = (fuel: string) => {
    setSelectedFuels(prev => 
      prev.includes(fuel) ? prev.filter(f => f !== fuel) : [...prev, fuel]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brand) return toast.error('Nome e Bandeira são obrigatórios.');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase.from('gas_stations').insert({
      user_id: u.user.id,
      name,
      address: address || null,
      brand,
      fuel_types: selectedFuels,
    });

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Posto cadastrado com sucesso!');
    navigate('/despesa/combustivel');
  };

  return (
    <AppShell back title="CADASTRAR NOVO POSTO">
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>SALVAR POSTO</SubmitButton>}>
          <Field label="Nome do Posto">
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: Posto São José" 
              required
            />
          </Field>

          <Field label="Endereço Completo (Opcional)">
            <Input 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="Ex: Av. ACM, 1000 - Salvador, BA" 
            />
          </Field>

          <Field label="Bandeira do Posto">
            <Input 
              list="brands"
              value={brand} 
              onChange={(e) => setBrand(e.target.value)} 
              placeholder="Selecione ou digite (Shell, BR, Ipiranga...)" 
              required
            />
            <datalist id="brands">
              <option value="Shell" />
              <option value="BR (Petrobras)" />
              <option value="Ipiranga" />
              <option value="Ale" />
              <option value="Menor Preço" />
              <option value="Bandeira Branca" />
            </datalist>
          </Field>

          <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-border/40">
            <h3 className="text-sm font-semibold text-primary uppercase">Combustíveis Disponíveis</h3>
            <div className="flex flex-col gap-2 mt-2">
              {fuelTypesList.map(fuel => (
                <label key={fuel} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-surface hover:bg-surface-high transition cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-primary text-primary focus:ring-primary bg-transparent"
                    checked={selectedFuels.includes(fuel)}
                    onChange={() => toggleFuel(fuel)}
                  />
                  <span className="font-bold uppercase text-sm text-foreground">{fuel}</span>
                </label>
              ))}
            </div>
          </div>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default NovoPosto;
