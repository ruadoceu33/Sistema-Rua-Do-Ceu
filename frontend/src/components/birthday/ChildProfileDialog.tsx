import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Calendar, Phone, School, Home, FileText, Cake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Birthday {
  id: string;
  name: string;
  currentAge: number;
  turningAge: number;
  birthDate: string;
  daysUntil: number;
  location: string;
  localId?: string;
}

interface ChildProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Birthday | null;
}

export function ChildProfileDialog({ open, onOpenChange, child }: ChildProfileDialogProps) {
  // Buscar dados completos da criança
  const { data: crianca, isLoading } = useQuery({
    queryKey: ['crianca', child?.id],
    queryFn: async () => {
      if (!child?.id) return null;
      const result = await apiClient.getCriancas();
      const criancas = result.data || result || [];
      return criancas?.find((c: any) => c.id === child.id);
    },
    enabled: !!child?.id && open,
  });

  if (!child) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "Não informado";
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil da Criança
          </DialogTitle>
          <DialogDescription>
            Informações detalhadas do cadastro
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingSpinner size="lg" text="Carregando perfil..." className="py-12" />
        ) : (
          <div className="space-y-6">
            {/* Header com Avatar e Nome */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {child.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground">{child.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {child.currentAge} {child.currentAge === 1 ? 'ano' : 'anos'}
                  </Badge>
                  {child.daysUntil <= 30 && (
                    <Badge variant="destructive" className="animate-pulse">
                      🎂 Aniversário em {child.daysUntil} dia{child.daysUntil !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {crianca?.ativo ? (
                    <Badge className="bg-green-500">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações Pessoais */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Cake className="h-4 w-4 text-primary" />
                Informações de Aniversário
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Data de Nascimento:</p>
                  <p className="font-medium">
                    {crianca?.data_nascimento ? formatDate(crianca.data_nascimento) : 'Não informado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Idade Atual:</p>
                  <p className="font-medium">{child.currentAge} {child.currentAge === 1 ? 'ano' : 'anos'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Próximo Aniversário:</p>
                  <p className="font-medium">{child.birthDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Fará:</p>
                  <p className="font-medium">{child.turningAge} {child.turningAge === 1 ? 'ano' : 'anos'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Local */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Local de Atendimento
              </h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{child.location}</p>
              </div>
            </div>

            <Separator />

            {/* Responsável */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Responsável
              </h4>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Nome:</p>
                  <p className="font-medium">{crianca?.responsavel || 'Não informado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Telefone:
                  </p>
                  <p className="font-medium">{formatPhone(crianca?.telefone_responsavel)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                Endereço
              </h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-medium">{crianca?.endereco || 'Não informado'}</p>
              </div>
            </div>

            {crianca?.escola && (
              <>
                <Separator />
                {/* Escola */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <School className="h-4 w-4 text-primary" />
                    Escola
                  </h4>
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Nome:</p>
                      <p className="font-medium">{crianca?.escola}</p>
                    </div>
                    {crianca?.numero_escola && (
                      <div className="space-y-1">
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          Telefone da Escola:
                        </p>
                        <p className="font-medium">{formatPhone(crianca?.numero_escola)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {crianca?.observacoes && (
              <>
                <Separator />
                {/* Observações */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Observações
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{crianca?.observacoes}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
