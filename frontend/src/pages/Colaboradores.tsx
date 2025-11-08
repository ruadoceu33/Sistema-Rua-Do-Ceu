import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Users, Building2, RotateCcw, UserCheck, UserX, Search, Filter, X, ChevronLeft, ChevronRight, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatPhoneInput, cleanPhone, isValidPhoneLength } from '@/lib/phoneUtils';

const colaboradorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional().refine((val) => {
    if (!val) return true; // Opcional
    return isValidPhoneLength(val);
  }, 'Telefone deve ter 10 ou 11 dígitos'),
  role: z.enum(['admin', 'colaborador', 'user']), // Aceitar 'user' também
  locais: z.array(z.string()),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')), // Aceitar string vazia
}).refine((data) => {
  // Se não for admin, deve ter pelo menos 1 local
  if (data.role !== 'admin' && data.locais.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Colaboradores devem ter pelo menos um local vinculado",
  path: ["locais"],
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirm_password: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Senhas não coincidem",
  path: ["confirm_password"],
});

type ColaboradorFormData = z.infer<typeof colaboradorSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: 'admin' | 'colaborador' | 'user';
  ativo: boolean;
  status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
  colaborador_locais?: Array<{
    local_id: string;
    local: {
      id: string;
      nome: string;
    };
  }>;
}

interface Local {
  id: string;
  nome: string;
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Profile[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Profile | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15); // Padrão 15 (3 colunas)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvingColaborador, setApprovingColaborador] = useState<Profile | null>(null);
  const [selectedLocaisForApproval, setSelectedLocaisForApproval] = useState<string[]>([]);
  const [approvingLoading, setApprovingLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      role: 'colaborador',
      locais: [],
      password: '',
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  const fetchColaboradores = async () => {
    try {
      // Buscar todos os colaboradores (ativos e inativos) para permitir filtros
      const result = await apiClient.getColaboradores();
      const data = result.data || result || [];
      setColaboradores(data as Profile[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const fetchLocais = async () => {
    try {
      const result = await apiClient.getLocais();
      const data = result.data || result || [];
      setLocais(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar locais",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchColaboradores(), fetchLocais()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const onSubmit = async (data: ColaboradorFormData) => {
    try {
      if (!editingColaborador) {
        toast({
          title: "Erro",
          description: "Nenhum colaborador selecionado para edição",
          variant: "destructive",
        });
        return;
      }

      // Atualizar colaborador existente (SEM enviar role - não pode ser alterado)
      await apiClient.updateColaborador(editingColaborador.id, {
        nome: data.nome,
        telefone: data.telefone ? cleanPhone(data.telefone) : undefined,
        locais: data.locais,
      });

      toast({
        title: "Colaborador atualizado com sucesso!",
      });

      form.reset();
      setIsDialogOpen(false);
      setEditingColaborador(null);
      fetchColaboradores();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar colaborador",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (colaborador: Profile) => {
    setEditingColaborador(colaborador);
    form.reset({
      nome: colaborador.nome,
      email: colaborador.email,
      telefone: colaborador.telefone || '',
      role: colaborador.role,
      locais: colaborador.colaborador_locais?.map(cl => cl.local_id) || [],
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (colaborador: Profile) => {
    if (colaborador.role === 'admin') {
      toast({
        title: "Ação não permitida",
        description: "Não é possível desativar um administrador.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.toggleColaboradorStatus(colaborador.id);
      const newStatus = !colaborador.ativo;

      toast({
        title: newStatus ? "Colaborador ativado!" : "Colaborador desativado!",
        description: newStatus
          ? "O colaborador pode fazer login normalmente"
          : "O colaborador não pode mais fazer login",
      });

      fetchColaboradores();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    if (!resetPasswordUserId) return;

    try {
      await apiClient.resetColaboradorPassword(resetPasswordUserId, {
        new_password: data.new_password,
      });

      toast({
        title: "Senha redefinida com sucesso!",
        description: "A nova senha já pode ser utilizada para login",
      });

      resetPasswordForm.reset();
      setResetPasswordUserId(null);
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRole("all");
    setCurrentPage(1);
  };

  const handleOpenApprovalDialog = (colaborador: Profile) => {
    setApprovingColaborador(colaborador);
    setSelectedLocaisForApproval(colaborador.colaborador_locais?.map(cl => cl.local_id) || []);
    setIsApprovalDialogOpen(true);
  };

  const handleApproval = async () => {
    if (!approvingColaborador) return;

    if (selectedLocaisForApproval.length === 0) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione pelo menos um local para aprovar o colaborador.",
        variant: "destructive",
      });
      return;
    }

    setApprovingLoading(true);
    try {
      await apiClient.aprovarColaborador(approvingColaborador.id, {
        locais: selectedLocaisForApproval
      });

      toast({
        title: "Colaborador aprovado!",
        description: `${approvingColaborador.nome} foi aprovado e pode acessar o sistema.`,
      });

      setIsApprovalDialogOpen(false);
      setApprovingColaborador(null);
      setSelectedLocaisForApproval([]);
      fetchColaboradores();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || "Erro ao aprovar colaborador";
      toast({
        title: "Erro na aprovação",
        description: errorMsg,
        variant: "destructive",
      });
    }
    setApprovingLoading(false);
  };

  const toggleLocalSelection = (localId: string) => {
    setSelectedLocaisForApproval(prev => {
      if (prev.includes(localId)) {
        return prev.filter(id => id !== localId);
      } else {
        return [...prev, localId];
      }
    });
  };

  const hasActiveFilters = searchTerm || selectedRole !== "all";

  // Filtrar colaboradores
  const filteredColaboradores = colaboradores.filter(colaborador => {
    // Filtro de busca por nome ou email
    const matchesSearch = colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      colaborador.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de role
    const matchesRole = selectedRole === "all" ? true : colaborador.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // Paginação
  const totalPages = Math.ceil(filteredColaboradores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedColaboradores = filteredColaboradores.slice(startIndex, endIndex);

  // Reset page quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Administração</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie colaboradores, aprovar cadastros e configurações do sistema
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Colaborador</DialogTitle>
              <DialogDescription>
                Edite as informações do colaborador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  {...form.register('nome')}
                  placeholder="Nome do colaborador"
                />
                {form.formState.errors.nome && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.watch('email')}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  {...form.register('telefone')}
                  placeholder="(11) 99999-9999"
                  onChange={(e) => {
                    const formatted = formatPhoneInput(e.target.value);
                    form.setValue('telefone', formatted);
                  }}
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de usuário</Label>
                <Input
                  value={form.watch('role') === 'admin' ? 'Administrador' : 'Colaborador'}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  O tipo de usuário não pode ser alterado por motivos de segurança
                </p>
              </div>

              <div className="space-y-2">
                <Label>Locais de acesso</Label>
                <p className="text-xs text-muted-foreground">
                  {form.watch('role') === 'admin'
                    ? 'Administradores têm acesso a todos os locais automaticamente'
                    : 'Colaboradores devem ter pelo menos um local vinculado'}
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {locais.map((local) => (
                    <div key={local.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={local.id}
                        checked={form.watch('locais').includes(local.id)}
                        onCheckedChange={(checked) => {
                          const current = form.watch('locais');
                          if (checked) {
                            form.setValue('locais', [...current, local.id]);
                          } else {
                            form.setValue('locais', current.filter(id => id !== local.id));
                          }
                        }}
                        disabled={form.watch('role') === 'admin'}
                      />
                      <Label htmlFor={local.id} className="text-sm font-normal">
                        {local.nome}
                      </Label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.locais && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.locais.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setEditingColaborador(null);
                  form.reset();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Atualizar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para resetar senha */}
        <Dialog open={!!resetPasswordUserId} onOpenChange={(open) => !open && setResetPasswordUserId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Redefinir Senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para o colaborador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...resetPasswordForm.register('new_password')}
                  placeholder="Digite a nova senha"
                />
                {resetPasswordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">
                    {resetPasswordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...resetPasswordForm.register('confirm_password')}
                  placeholder="Confirme a nova senha"
                />
                {resetPasswordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">
                    {resetPasswordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setResetPasswordUserId(null);
                  resetPasswordForm.reset();
                }} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Redefinir Senha
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para aprovar colaborador */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={(open) => {
          setIsApprovalDialogOpen(open);
          if (!open) {
            setApprovingColaborador(null);
            setSelectedLocaisForApproval([]);
          }
        }}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aprovar Colaborador</DialogTitle>
              <DialogDescription>
                Selecione os locais onde {approvingColaborador?.nome} poderá atuar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Info do colaborador */}
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm font-medium">{approvingColaborador?.nome}</p>
                <p className="text-xs text-muted-foreground">{approvingColaborador?.email}</p>
              </div>

              {/* Seleção de locais */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Locais de atuação <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Selecione pelo menos um local
                </p>

                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                  {locais.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum local cadastrado
                    </p>
                  ) : (
                    locais.map((local) => (
                      <div key={local.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`local-${local.id}`}
                          checked={selectedLocaisForApproval.includes(local.id)}
                          onCheckedChange={() => toggleLocalSelection(local.id)}
                        />
                        <Label
                          htmlFor={`local-${local.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {local.nome}
                        </Label>
                      </div>
                    ))
                  )}
                </div>

                {selectedLocaisForApproval.length === 0 && (
                  <p className="text-xs text-destructive">
                    Selecione pelo menos um local para aprovar
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setApprovingColaborador(null);
                  setSelectedLocaisForApproval([]);
                }}
                disabled={approvingLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApproval}
                disabled={approvingLoading || selectedLocaisForApproval.length === 0}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {approvingLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Aprovar Colaborador
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
          {/* Filters Card */}
          <Card className="shadow-subtle overflow-hidden">
            <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
              {/* Busca sempre visível */}
              <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  className="pl-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtros Avançados - Accordion no mobile */}
              <div className="block sm:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="filters" className="border-none">
                    <AccordionTrigger className="py-2 text-sm hover:no-underline">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Filtros Avançados</span>
                        {selectedRole !== "all" && (
                          <Badge variant="default" className="ml-2 text-xs">1</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tipos</SelectItem>
                          <SelectItem value="admin">Administradores</SelectItem>
                          <SelectItem value="user">Colaboradores</SelectItem>
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Layout Desktop */}
              <div className="hidden sm:block">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="user">Colaboradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags de filtros ativos */}
              {hasActiveFilters && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 mt-3 border-t">
                  <div className="flex items-start sm:items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Filtros ativos:
                    </span>

                    {searchTerm && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        Busca: "{searchTerm.length > 12 ? searchTerm.substring(0, 12) + '...' : searchTerm}"
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => setSearchTerm("")}
                        />
                      </Badge>
                    )}

                    {selectedRole !== "all" && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {selectedRole === "admin" ? "Admins" : "Colaboradores"}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => setSelectedRole("all")}
                        />
                      </Badge>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Limpar Todos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="w-full overflow-hidden">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {paginatedColaboradores.map((colaborador) => (
              <Card key={colaborador.id} className={`overflow-hidden w-full min-w-0 ${!colaborador.ativo ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{colaborador.nome}</span>
                      </CardTitle>
                      <Badge variant={colaborador.role === 'admin' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                        {colaborador.role === 'admin' ? 'Admin' : 'Colab'}
                      </Badge>
                    </div>

                    {/* Badges de status */}
                    <div className="flex flex-wrap gap-1">
                      {!colaborador.ativo && (
                        <Badge variant="destructive" className="text-xs shrink-0 whitespace-nowrap">
                          Inativo
                        </Badge>
                      )}
                      {colaborador.status_aprovacao === 'pendente' && (
                        <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap bg-yellow-50 text-yellow-700 border-yellow-300">
                          Pendente de aprovação
                        </Badge>
                      )}
                      {colaborador.status_aprovacao === 'aprovado' && colaborador.role !== 'admin' && (
                        <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap bg-green-50 text-green-700 border-green-300">
                          Aprovado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="truncate">{colaborador.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                  {colaborador.telefone && (
                    <p className="text-sm text-muted-foreground break-words">
                      📞 {formatPhoneInput(colaborador.telefone)}
                    </p>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">Locais:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(colaborador.colaborador_locais || []).map((cl) => (
                        <Badge key={cl.local_id} variant="outline" className="text-xs">
                          {cl.local.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {/* Botão Aprovar - apenas para pendentes */}
                    {colaborador.status_aprovacao === 'pendente' && colaborador.role !== 'admin' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenApprovalDialog(colaborador)}
                        title="Aprovar colaborador"
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      >
                        <UserCheck className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Aprovar</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(colaborador)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetPasswordUserId(colaborador.id)}
                      title="Resetar senha"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    {colaborador.role !== 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            title={colaborador.ativo ? "Desativar" : "Ativar"}
                          >
                            {colaborador.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {colaborador.ativo ? 'Desativar colaborador?' : 'Ativar colaborador?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {colaborador.ativo
                                ? `O colaborador ${colaborador.nome} não poderá mais fazer login no sistema.`
                                : `O colaborador ${colaborador.nome} poderá fazer login normalmente.`
                              }
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleToggleActive(colaborador)}>
                              {colaborador.ativo ? 'Desativar' : 'Ativar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>

          {/* Controles de Paginação */}
          {filteredColaboradores.length > 0 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredColaboradores.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[15, 30, 60, 100]}
                showItemsPerPage={true}
                showTotalItems={true}
              />
            </div>
          )}

          {filteredColaboradores.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">Nenhum colaborador encontrado</CardTitle>
                <CardDescription>
                  {hasActiveFilters
                    ? "Nenhum colaborador corresponde aos filtros aplicados. Tente ajustar os critérios de busca."
                    : "Comece cadastrando um novo colaborador."}
                </CardDescription>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}