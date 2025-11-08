import { Clock, Package, Gift, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TimelineItem {
  id: string;
  data_entrega: string;
  doacao: {
    id: string;
    doador: string;
    tipo_doacao: string;
    descricao: string;
    quantidade?: number;
    unidade?: string;
    data_doacao?: string;
  };
  quantidade_consumida: number;
  observacoes?: string | null;
  tipo: 'consumo' | 'presente';
}

interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

export function Timeline({ items, emptyMessage = "Nenhum registro encontrado" }: TimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Presente de Aniversário':
        return <Gift className="h-4 w-4" />;
      case 'Alimentos':
      case 'Materiais':
      case 'Roupas':
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Presente de Aniversário':
        return 'default';
      case 'Alimentos':
        return 'secondary';
      case 'Materiais':
        return 'outline';
      case 'Roupas':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Linha vertical da timeline */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {items.map((item, index) => (
        <Card key={item.id} className="relative ml-12 hover:shadow-md transition-shadow">
          {/* Círculo da timeline */}
          <div className="absolute -left-[3.25rem] top-6 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
            {getTipoIcon(item.doacao.tipo_doacao)}
          </div>

          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={getTipoBadgeColor(item.doacao.tipo_doacao)}>
                  {item.doacao.tipo_doacao}
                </Badge>
                {item.tipo === 'presente' && (
                  <Badge variant="default" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                    Presente Entregue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatDate(item.data_entrega)}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-lg">{item.doacao.descricao}</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Doador:</span>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.doacao.doador}
                  </p>
                </div>

                {item.doacao.quantidade && (
                  <div>
                    <span className="text-muted-foreground">Quantidade:</span>
                    <p className="font-medium">
                      {item.quantidade_consumida} {item.doacao.unidade || 'unidade(s)'}
                    </p>
                  </div>
                )}
              </div>

              {item.observacoes && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Observações:</span>
                  <p className="text-sm mt-1">{item.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
