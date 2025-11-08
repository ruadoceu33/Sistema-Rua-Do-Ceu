import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const data = await apiClient.getDashboardStats();

      // Transformar dados do backend para formato esperado pelo Dashboard
      return {
        criancas: data?.summary?.totalChildren || 0,
        doacoes: data?.summary?.totalDoacoes || 0,
        locais: data?.summary?.totalLocals || 0,
        checkinsHoje: data?.summary?.recentCheckins || 0, // Últimos 30 dias
        colaboradores: data?.summary?.totalColaboradores || 0,
        // Dados adicionais
        childrenByLocal: data?.childrenByLocal || [],
        doacoesByTipo: data?.doacoesByTipo || [],
        checkinsByMonth: data?.checkinsByMonth || []
      };
    },
    enabled: !!user,
    staleTime: 0, // Dados sempre considerados "velhos"
    gcTime: 0, // Não guarda cache após unmount - força refetch quando remonta
    refetchOnWindowFocus: true, // Refetch ao voltar para a janela do dashboard
    refetchOnMount: 'always', // Sempre refetch ao montar componente (não usa cache)
  });
}