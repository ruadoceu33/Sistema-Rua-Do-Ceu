import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Activity {
  id: string;
  action: string;
  details: string;
  time: string;
  type: 'user' | 'donation' | 'checkin' | 'birthday';
  created_at: string;
}

export function useRecentActivity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const activities = await apiClient.getRecentActivity(7);
      return activities;
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
}