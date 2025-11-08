import { StatsCard } from "@/components/dashboard/StatsCard";
import { BirthdayWidget } from "@/components/dashboard/BirthdayWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";

import {
  Users,
  Gift,
  MapPin,
  UserCheck,
  Calendar,
  TrendingUp,
  Clock,
  BicepsFlexed,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-light to-secondary shadow-elegant">
        
        
        <div className="relative px-6 py-8 md:px-8 md:py-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BicepsFlexed className="h-6 w-6 text-white" />
              <Badge className="bg-white/20 text-white border-white/20">
                Bem-vindo ao Sistema
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-balance">
              Sistema Rua do Céu
            </h1>
            <p className="text-lg text-white/90 mb-6 text-balance">
              Gerencie doações, acompanhe aniversários e mantenha o controle completo 
              do seu serviço de atendimento infantil.
            </p>
            <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="shadow-md"
              onClick={() => navigate("/aniversarios")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ver Aniversários
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="shadow-md"
              onClick={() => navigate("/checkin")}
            >
              Fazer Check-in
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsLoading ? (
          <div className="col-span-full">
            <LoadingSpinner size="lg" text="Carregando estatísticas..." className="py-12" />
          </div>
        ) : (
          <>
            <StatsCard
              title="Crianças Cadastradas"
              value={stats?.criancas?.toString() || "0"}
              description="Total registradas"
              icon={Users}
              variant="primary"
            />
            <StatsCard
              title="Doações Registradas"
              value={stats?.doacoes?.toString() || "0"}
              description="Total de doações"
              icon={Gift}
              variant="secondary"
            />
            <StatsCard
              title="Locais Ativos"
              value={stats?.locais?.toString() || "0"}
              description="Pontos de atendimento"
              icon={MapPin}
            />
            <StatsCard
              title="Check-ins Recentes"
              value={stats?.checkinsHoje?.toString() || "0"}
              description="Últimos 30 dias"
              icon={UserCheck}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Birthday Widget - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <BirthdayWidget />
        </div>

        {/* Quick Actions */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/criancas")}
            >
              <Users className="h-4 w-4" />
              Cadastrar Criança
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/doacoes")}
            >
              <Gift className="h-4 w-4" />
              Registrar Doação
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/checkin")}
            >
              <UserCheck className="h-4 w-4" />
              Fazer Check-in
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/locais")}
            >
              <MapPin className="h-4 w-4" />
              Gerenciar Locais
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Atividade Recente
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/relatorios")}
            >
              Ver Todas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {activitiesLoading ? (
              <LoadingSpinner text="Carregando atividades..." className="py-8" />
            ) : activities && activities.length > 0 ? (
              activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'user' ? 'bg-primary/10 text-primary' :
                  activity.type === 'donation' ? 'bg-secondary/10 text-secondary' :
                  activity.type === 'checkin' ? 'bg-tertiary/10 text-tertiary' :
                  'bg-accent/10 text-accent-foreground'
                }`}>
                  {activity.type === 'user' && <Users className="h-4 w-4" />}
                  {activity.type === 'donation' && <Gift className="h-4 w-4" />}
                  {activity.type === 'checkin' && <UserCheck className="h-4 w-4" />}
                  {activity.type === 'birthday' && <Calendar className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Nenhuma atividade recente"
                description="Quando ações como cadastros, doações e check-ins forem realizadas, elas aparecerão aqui."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}