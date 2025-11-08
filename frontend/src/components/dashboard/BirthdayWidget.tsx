import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Gift, ArrowRight } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { useBirthdays } from "@/hooks/useBirthdays";
import { useNavigate } from "react-router-dom";

interface BirthdayWidgetProps {
  className?: string;
}

export function BirthdayWidget({ className }: BirthdayWidgetProps) {
  const navigate = useNavigate();

  // Buscar aniversários dos próximos 30 dias usando o mesmo hook da página de Aniversários
  const { data: allBirthdays, isLoading } = useBirthdays({});

  // Filtrar apenas os próximos 30 dias
  const upcomingBirthdays = allBirthdays?.filter(child => child.daysUntil <= 30) || [];
  const thisWeek = allBirthdays?.filter(child => child.daysUntil <= 7) || [];

  if (isLoading) {
    return (
      <Card className={cn("gradient-accent shadow-elegant", className)}>
        <CardContent className="py-12">
          <LoadingSpinner size="lg" text="Carregando aniversários..." className="text-white" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("gradient-accent shadow-elegant", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">
                Aniversários do Mês
              </CardTitle>
              <p className="text-white/80 text-sm">
                {upcomingBirthdays.length} aniversariantes
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/20 hover:bg-white/30">
            {thisWeek.length} esta semana
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {upcomingBirthdays.slice(0, 4).map((child) => (
          <div
            key={child.id}
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/15 transition-smooth cursor-pointer"
            onClick={() => navigate('/aniversarios')}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-white/20 text-white font-medium">
                {child.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {child.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>Fará {child.turningAge} anos</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  {child.daysUntil === 0 ? "Hoje!" :
                   child.daysUntil === 1 ? "Amanhã" :
                   `${child.daysUntil} dias`}
                </span>
              </div>
            </div>

            {child.daysUntil <= 3 && (
              <div className="animate-bounce-gentle">
                <Badge
                  variant="secondary"
                  className="bg-tertiary text-tertiary-foreground font-medium"
                >
                  Urgente!
                </Badge>
              </div>
            )}
          </div>
        ))}

        {upcomingBirthdays.length > 4 && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 transition-smooth"
              size="sm"
              onClick={() => navigate('/aniversarios')}
            >
              Ver todos os {upcomingBirthdays.length} aniversariantes
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {upcomingBirthdays.length === 0 && (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-white/50 mx-auto mb-3" />
            <p className="text-white/80">
              Nenhum aniversário nos próximos 30 dias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}