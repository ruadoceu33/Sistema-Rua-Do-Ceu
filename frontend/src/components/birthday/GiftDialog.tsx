import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Birthday | null;
}

export function GiftDialog({ open, onOpenChange, child }: GiftDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    doador: "",
    descricao: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiClient.createDoacao(data);
    },
    onSuccess: () => {
      toast({
        title: "Presente registrado!",
        description: `Presente de aniversário para ${child?.name} registrado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ['birthdays'] });
      queryClient.invalidateQueries({ queryKey: ['doacoes'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar presente",
        description: error.response?.data?.error?.message || "Ocorreu um erro ao registrar o presente.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData({
      doador: "",
      descricao: "",
    });
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!child) return;

    const doacaoData = {
      doador: formData.doador,
      tipo_doacao: "Presente de Aniversário",
      descricao: formData.descricao || `Presente de aniversário para ${child.name} (${child.turningAge} ${child.turningAge === 1 ? 'ano' : 'anos'})`,
      quantidade: 1,
      unidade: "unidade",
      local_id: child.localId || "", // Precisa do ID do local
      data_doacao: new Date().toISOString(),
      criancas_destinatarias: [child.id], // Adicionar criança como destinatária
    };

    mutation.mutate(doacaoData);
  };

  if (!child) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-secondary" />
            Registrar Presente de Aniversário
          </DialogTitle>
          <DialogDescription>
            Registre a doação de presente para o aniversariante
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações da Criança */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Aniversariante:</span>
              <span className="text-sm font-bold text-primary">{child.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Aniversário:</span>
              <span className="text-sm">{child.birthDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Idade:</span>
              <span className="text-sm">{child.currentAge} → {child.turningAge} {child.turningAge === 1 ? 'ano' : 'anos'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Local:</span>
              <span className="text-sm">{child.location}</span>
            </div>
          </div>

          {/* Campos do Formulário */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doador">
                Nome do Doador <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doador"
                placeholder="Quem está doando o presente?"
                value={formData.doador}
                onChange={(e) => setFormData({ ...formData, doador: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">
                Descrição do Presente <span className="text-muted-foreground">(Opcional)</span>
              </Label>
              <Textarea
                id="descricao"
                placeholder="Ex: Bicicleta vermelha, Boneca, Carrinho..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Se não preencher, será registrado como "Presente de aniversário"
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Registrar Presente
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
