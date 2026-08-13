import React from 'react';
import { Manutencao } from './Manutencao';

/**
 * TrocasOleo.tsx — Re-export do módulo unificado Manutencao para preservar compatibilidade total com rotas e imports legados.
 */
export const TrocasOleo: React.FC = () => {
  return <Manutencao />;
};

export default TrocasOleo;
