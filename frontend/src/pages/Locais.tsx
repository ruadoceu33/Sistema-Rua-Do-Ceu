import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, MapPin, Users, User, Phone } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatPhoneInput, cleanPhone } from "@/lib/phoneUtils";

const localSchema = z.object({
  nome: z.string().min(2, "Nome do local é obrigatório"),
  endereco: z.string().min(5, "Endereço é obrigatório"),
  responsavel: z.string().optional(),
  telefone: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // Opcional, aceita vazio
      const cleaned = cleanPhone(val);
      return cleaned.length === 10 || cleaned.length === 11;
    }, "Telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular)")
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const cleaned = cleanPhone(val);
      if (cleaned.length === 11 && cleaned.charAt(2) !== '9') {
        return false;
      }
      if (cleaned.length === 10 && cleaned.charAt(2) === '9') {
        return false;
      }
      return true;
    }, "Celular (11 dígitos) deve começar com 9 após o DDD. Fixo (10 dígitos) não pode começar com 9"),
});

type LocalFormData = z.infer<typeof localSchema>;

interface Local {
  id: string;
  nome: string;
  endereco: string;
  responsavel?: string;
  telefone?: string;
  _count?: {
    criancas: number;
  };
}

export default function Locais() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [criancasPorLocal, setCriancasPorLocal] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const form = useForm<LocalFormData>({
    resolver: zodResolver(localSchema),
    defaultValues: {
      nome: "",
      endereco: "",
      responsavel: "",
      telefone: "",
    },
  });

  const fetchLocais = async () => {
    try {
      const resultLocais = await apiClient.getLocais();
      const locaisData = resultLocais.data || resultLocais || [];
      setLocais(locaisData);

      // Buscar contagem de crianças para cada local
      const resultCriancas = await apiClient.getCriancas({ ativo: true });
      const criancasData = resultCriancas.data || resultCriancas || [];
      const contagem: Record<string, number> = {};

      criancasData.forEach((crianca: any) => {
        if (crianca.local_id) {
          contagem[crianca.local_id] = (contagem[crianca.local_id] || 0) + 1;
        }
      });

      setCriancasPorLocal(contagem);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar locais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocais();
  }, []);

  const onSubmit = async (data: LocalFormData) => {
    try {
      const localData = {
        nome: data.nome,
        endereco: data.endereco,
        responsavel: data.responsavel || null,
        telefone: data.telefone ? cleanPhone(data.telefone) : null,
      };

      if (editingLocal) {
        await apiClient.updateLocal(editingLocal.id, localData);
        toast({
          title: "Sucesso",
          description: "Local atualizado com sucesso!",
        });
      } else {
        await apiClient.createLocal(localData);
        toast({
          title: "Sucesso",
          description: "Local cadastrado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingLocal(null);
      form.reset();
      fetchLocais();
    } catch (error: any) {
      console.error('Erro ao salvar local:', error);

      // Tentar extrair mensagem específica do backend
      let errorMessage = "Erro ao salvar local";

      if (error?.response?.data?.error?.details) {
        // Erro de validação do express-validator
        const details = error.response.data.error.details;
        errorMessage = details.map((d: any) => d.msg).join(', ');
      } else if (error?.response?.data?.error?.message) {
        // Mensagem de erro genérica do backend
        errorMessage = error.response.data.error.message;
      }

      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (local: Local) => {
    setEditingLocal(local);
    form.reset({
      nome: local.nome,
      endereco: local.endereco,
      responsavel: local.responsavel || "",
      telefone: formatPhoneInput(local.telefone || ""),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este local?")) return;

    try {
      await apiClient.deleteLocal(id);
      toast({
        title: "Sucesso",
        description: "Local removido com sucesso!",
      });
      fetchLocais();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover local",
        variant: "destructive",
      });
    }
  };

  const filteredLocais = locais.filter(local =>
    local.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    local.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (local.responsavel && local.responsavel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginação client-side
  const totalFilteredItems = filteredLocais.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocais = filteredLocais.slice(startIndex, endIndex);

  // Resetar para primeira página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locais</h1>
          <p className="text-muted-foreground">
            Gerencie os locais de atendimento e atividades
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLocal(null);
              form.reset();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Local
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLocal ? "Editar Local" : "Cadastrar Novo Local"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingLocal ? "Formulário para editar informações do local" : "Formulário para cadastrar novo local de atendimento"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Local</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 0000-0000 ou (00) 00000-0000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingLocal ? "Atualizar" : "Cadastrar"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, endereço ou responsável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-auto w-full">
        {paginatedLocais.map((local) => (
          <Card key={local.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <CardTitle className="text-lg break-words">{local.nome}</CardTitle>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 h-fit">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{criancasPorLocal[local.id] || 0} {criancasPorLocal[local.id] === 1 ? 'criança' : 'crianças'}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 inline mr-2" />
                {local.endereco}
              </div>
              
              {local.responsavel && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{local.responsavel}</span>
                </div>
              )}

              {local.telefone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhoneInput(local.telefone)}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(local)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(local.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controles de Paginação */}
      {filteredLocais.length > 0 && (
        <div className="mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            totalItems={totalFilteredItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[15, 30, 60, 100]}
            showItemsPerPage={true}
            showTotalItems={true}
          />
        </div>
      )}

      {filteredLocais.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Nenhum local encontrado</CardTitle>
            <CardDescription>
              {searchTerm
                ? "Nenhum local corresponde aos critérios de busca."
                : "Comece cadastrando o primeiro local de atendimento."}
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}