import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Birthday {
  id: string;
  name: string;
  currentAge: number;
  turningAge: number;
  birthDate: string;
  daysUntil: number;
  location: string;
  localId?: string;
  data_nascimento: string;
}

interface BirthdayFilters {
  searchTerm?: string;
  localId?: string;
  period?: 'this-month' | 'next-month' | 'quarter' | 'year';
  selectedMonth?: number;
  selectedYear?: number;
}

export function useBirthdays(filters: BirthdayFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['birthdays', filters],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const result = await apiClient.getCriancas({ ativo: true });
      const criancas = result.data || result || [];

      const now = new Date();
      const currentYear = now.getFullYear();

      const birthdays: Birthday[] = criancas?.map((crianca) => {
        const birthDate = new Date(crianca.data_nascimento);
        
        // Calcular idade atual
        let currentAge = currentYear - birthDate.getFullYear();
        const monthDiff = now.getMonth() - birthDate.getMonth();
        const dayDiff = now.getDate() - birthDate.getDate();
        
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          currentAge--;
        }

        // Próximo aniversário
        const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < now) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        // Dias até o próximo aniversário
        const daysUntil = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: crianca.id,
          name: crianca.nome,
          currentAge,
          turningAge: currentAge + 1,
          birthDate: `${birthDate.getDate().toString().padStart(2, '0')}/${(birthDate.getMonth() + 1).toString().padStart(2, '0')}`,
          daysUntil: daysUntil === 0 ? 0 : daysUntil,
          location: (crianca as any).local?.nome || 'Sem local',
          localId: (crianca as any).local?.id,
          data_nascimento: crianca.data_nascimento
        };
      }) || [];

      // Aplicar filtros
      let filteredBirthdays = birthdays;

      // Filtro por termo de busca
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredBirthdays = filteredBirthdays.filter(birthday =>
          birthday.name.toLowerCase().includes(term) ||
          birthday.location.toLowerCase().includes(term)
        );
      }

      // Filtro por local
      if (filters.localId) {
        filteredBirthdays = filteredBirthdays.filter(birthday =>
          (criancas?.find(c => c.id === birthday.id) as any)?.local?.id === filters.localId
        );
      }

      // Filtro por período
      if (filters.period) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        filteredBirthdays = filteredBirthdays.filter(birthday => {
          const birthDate = new Date(birthday.data_nascimento);
          
          switch (filters.period) {
            case 'this-month':
              return birthDate.getMonth() === currentMonth;
            case 'next-month':
              const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
              return birthDate.getMonth() === nextMonth;
            case 'quarter':
              return birthday.daysUntil <= 90;
            case 'year':
              return true; // Já está mostrando o ano todo
            default:
              return true;
          }
        });
      }

      // Filtro por mês/ano específico
      if (filters.selectedMonth !== undefined || filters.selectedYear !== undefined) {
        filteredBirthdays = filteredBirthdays.filter(birthday => {
          const birthDate = new Date(birthday.data_nascimento);
          
          if (filters.selectedMonth !== undefined && birthDate.getMonth() !== filters.selectedMonth) {
            return false;
          }
          
          // Se específico ano for selecionado, mostrar apenas aniversários daquele ano
          if (filters.selectedYear !== undefined) {
            const nextBirthday = new Date(filters.selectedYear, birthDate.getMonth(), birthDate.getDate());
            return nextBirthday.getFullYear() === filters.selectedYear;
          }
          
          return true;
        });
      }

      // Ordenar por dias até aniversário
      return filteredBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
}

export function useBirthdayStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['birthday-stats'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const result = await apiClient.getCriancas({ ativo: true });
      const criancas = result.data || result || [];

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let thisMouth = 0;
      let thisWeek = 0;
      let next30Days = 0;
      let totalAge = 0;

      criancas?.forEach((crianca) => {
        const birthDate = new Date(crianca.data_nascimento);
        
        // Calcular idade atual
        let age = currentYear - birthDate.getFullYear();
        const monthDiff = now.getMonth() - birthDate.getMonth();
        const dayDiff = now.getDate() - birthDate.getDate();
        
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }
        totalAge += age;

        // Próximo aniversário
        const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < now) {
          nextBirthday.setFullYear(currentYear + 1);
        }

        const daysUntil = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Contar aniversários
        if (birthDate.getMonth() === currentMonth) thisMouth++;
        if (daysUntil <= 7) thisWeek++;
        if (daysUntil <= 30) next30Days++;
      });

      const averageAge = criancas?.length ? (totalAge / criancas.length).toFixed(1) : '0';

      return {
        thisMouth,
        thisWeek,
        next30Days,
        averageAge: parseFloat(averageAge)
      };
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
}