import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { DatePicker, dateToLocalISOString, stringToLocalDate } from "@/components/ui/date-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Baby, Calendar, User, Phone, MapPin, Building2, Filter, X, Settings, Eye, Check, ChevronDown, History, Package, SlidersHorizontal } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GerenciarTags } from "@/components/admin/GerenciarTags";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatPhoneInput, cleanPhone, isValidPhoneLength } from "@/lib/phoneUtils";
import { formatDateForInput } from "@/lib/dateUtils";

const criancaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  local_id: z.string().min(1, "Local é obrigatório"),
  responsavel: z.string().min(2, "Nome do responsável é obrigatório"),
  telefone_responsavel: z.string()
    .min(1, "Telefone é obrigatório")
    .refine((val) => {
      const cleaned = cleanPhone(val);
      return cleaned.length === 10 || cleaned.length === 11;
    }, "Telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular)")
    .refine((val) => {
      const cleaned = cleanPhone(val);
      if (cleaned.length === 11 && cleaned.charAt(2) !== '9') {
        return false;
      }
      if (cleaned.length === 10 && cleaned.charAt(2) === '9') {
        return false;
      }
      return true;
    }, "Celular (11 dígitos) deve começar com 9 após o DDD. Fixo (10 dígitos) não pode começar com 9"),

  // Responsáveis adicionais
  responsavel2: z.string().optional(),
  telefone_responsavel2: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
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

  responsavel3: z.string().optional(),
  telefone_responsavel3: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
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

  endereco: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  escola: z.string().optional(),
  numero_escola: z.string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
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

  // Tags de saúde
  tags_saude: z.array(z.object({
    tag_id: z.string(),
    observacao: z.string().optional()
  })).optional(),

  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type CriancaFormData = z.infer<typeof criancaSchema>;

interface Local {
  id: string;
  nome: string;
  endereco: string;
}

interface Crianca {
  id: string;
  nome: string;
  data_nascimento: string;
  idade: number;
  responsavel: string;
  telefone_responsavel: string;
  endereco: string;
  escola?: string;
  numero_escola?: string;
  observacoes?: string;
  ativo: boolean;
  local_id?: string;
  local?: Local;

  // Novos campos
  responsavel2?: string;
  telefone_responsavel2?: string;
  responsavel3?: string;
  telefone_responsavel3?: string;
  tags_saude?: Array<{
    id: string;
    tag_id: string;
    observacao?: string;
    tag: {
      id: string;
      nome: string;
      cor?: string;
    };
  }>;
}

export default function Criancas() {
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [selectedLocal, setSelectedLocal] = useState<string>("all");
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrianca, setEditingCrianca] = useState<Crianca | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Novos filtros
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([]);

  // Novos states
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [mostrarResponsavel2, setMostrarResponsavel2] = useState(false);
  const [mostrarResponsavel3, setMostrarResponsavel3] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tagsSaude, setTagsSaude] = useState<Array<{ id: string; nome: string; cor?: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [perfilDialogOpen, setPerfilDialogOpen] = useState(false);
  const [criancaPerfil, setCriancaPerfil] = useState<Crianca | null>(null);

  // Estados para histórico de doações
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [historicoDoacoes, setHistoricoDoacoes] = useState<any>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [historicoTipo, setHistoricoTipo] = useState("todos");
  const [historicoDataInicio, setHistoricoDataInicio] = useState("");
  const [historicoDataFim, setHistoricoDataFim] = useState("");
  const [historicoBuscaTipo, setHistoricoBuscaTipo] = useState("");
  const [criancaHistorico, setCriancaHistorico] = useState<Crianca | null>(null);

  // Obter usuário do localStorage para verificar se é admin
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Resetar states de responsáveis quando o dialog fecha
  useEffect(() => {
    if (!isDialogOpen) {
      setMostrarResponsavel2(false);
      setMostrarResponsavel3(false);
      setSelectedTags([]);
    }
  }, [isDialogOpen]);

  // Função para buscar tags (será reutilizada)
  const fetchTags = async () => {
    try {
      const data = await apiClient.getTagsSaude();
      setTagsSaude(data || []);
    } catch (error) {
      console.error('Erro ao buscar tags de saúde:', error);
    }
  };

  // Buscar tags de saúde disponíveis ao montar componente
  useEffect(() => {
    fetchTags();
  }, []);

  // Função para buscar histórico de doações
  const fetchHistoricoDoacoes = async (criancaId: string) => {
    try {
      setLoadingHistorico(true);
      const data = await apiClient.getHistoricoDoacoesCrianca(criancaId, {
        page: historicoPage,
        limit: 20,
        tipo: historicoTipo !== "todos" ? historicoTipo : undefined,
        data_inicio: historicoDataInicio || undefined,
        data_fim: historicoDataFim || undefined
      });
      setHistoricoDoacoes(data);
    } catch (error) {
      console.error('Erro ao buscar histórico de doações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de doações",
        variant: "destructive",
      });
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Recarregar histórico quando página ou filtro mudar
  useEffect(() => {
    if (historicoDialogOpen && criancaHistorico) {
      fetchHistoricoDoacoes(criancaHistorico.id);
    }
  }, [historicoPage, historicoTipo, historicoDataInicio, historicoDataFim, historicoDialogOpen]);

  // Função para limpar filtros do histórico
  const limparFiltrosHistorico = () => {
    setHistoricoTipo("todos");
    setHistoricoDataInicio("");
    setHistoricoDataFim("");
    setHistoricoBuscaTipo("");
    setHistoricoPage(1);
  };

  const form = useForm<CriancaFormData>({
    resolver: zodResolver(criancaSchema),
    defaultValues: {
      nome: "",
      data_nascimento: "",
      local_id: "",
      responsavel: "",
      telefone_responsavel: "",
      responsavel2: undefined,
      telefone_responsavel2: undefined,
      responsavel3: undefined,
      telefone_responsavel3: undefined,
      endereco: "",
      escola: "",
      numero_escola: undefined,
      tags_saude: [],
      observacoes: undefined,
      ativo: true,
    },
  });

  const fetchCriancas = async () => {
    try {
      setLoading(true);
      // Buscar todas as crianças SEM paginação para permitir filtros client-side
      const result = await apiClient.getCriancas();
      const data = result.data || result || [];
      setCriancas(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar crianças",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocais = async () => {
    try {
      const result = await apiClient.getLocais();
      const data = result.data || result || [];
      setLocais(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar locais",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCriancas();
    fetchLocais();
  }, []);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const onSubmit = async (data: CriancaFormData) => {
    try {
      const idade = calculateAge(data.data_nascimento);

      // Converter selectedTags em formato tags_saude
      const tags_saude = selectedTags.map(tag_id => ({
        tag_id,
        observacao: ""
      }));

      // Limpar formatação dos telefones antes de enviar
      const cleanedData = {
        ...data,
        idade,
        telefone_responsavel: cleanPhone(data.telefone_responsavel),
        numero_escola: data.numero_escola ? cleanPhone(data.numero_escola) : undefined,
        tags_saude,
      };

      if (editingCrianca) {
        await apiClient.updateCrianca(editingCrianca.id, cleanedData);
        toast({
          title: "Sucesso",
          description: "Criança atualizada com sucesso!",
        });
      } else {
        await apiClient.createCrianca(cleanedData);
        toast({
          title: "Sucesso",
          description: "Criança cadastrada com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingCrianca(null);
      form.reset();
      setSelectedTags([]);
      fetchCriancas();
    } catch (error: any) {
      console.error('Erro ao salvar criança:', error);

      // Tentar extrair mensagem específica do backend
      let errorMessage = "Erro ao salvar criança";

      if (error?.response?.data?.error?.details) {
        // Erro de validação do express-validator
        const details = error.response.data.error.details;
        errorMessage = details.map((d: any) => d.msg).join(', ');
      } else if (error?.response?.data?.error?.message) {
        // Mensagem de erro genérica do backend
        errorMessage = error.response.data.error.message;
      }

      toast({
        title: "Erro ao cadastrar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (crianca: Crianca) => {
    setEditingCrianca(crianca);

    // Mostrar seções de responsáveis se existirem dados
    if (crianca.responsavel2) {
      setMostrarResponsavel2(true);
    } else {
      setMostrarResponsavel2(false);
    }

    if (crianca.responsavel3) {
      setMostrarResponsavel3(true);
    } else {
      setMostrarResponsavel3(false);
    }

    // Preencher tags selecionadas
    const tagsIds = crianca.tags_saude?.map(ts => ts.tag_id) || [];
    setSelectedTags(tagsIds);

    form.reset({
      nome: crianca.nome,
      data_nascimento: formatDateForInput(crianca.data_nascimento),
      local_id: crianca.local_id || "",
      responsavel: crianca.responsavel,
      telefone_responsavel: formatPhoneInput(crianca.telefone_responsavel || ""),
      responsavel2: crianca.responsavel2 || undefined,
      telefone_responsavel2: crianca.telefone_responsavel2 ? formatPhoneInput(crianca.telefone_responsavel2) : undefined,
      responsavel3: crianca.responsavel3 || undefined,
      telefone_responsavel3: crianca.telefone_responsavel3 ? formatPhoneInput(crianca.telefone_responsavel3) : undefined,
      endereco: crianca.endereco,
      escola: crianca.escola || "",
      numero_escola: crianca.numero_escola ? formatPhoneInput(crianca.numero_escola) : undefined,
      tags_saude: crianca.tags_saude?.map(ts => ({ tag_id: ts.tag_id, observacao: ts.observacao || "" })) || [],
      observacoes: crianca.observacoes || undefined,
      ativo: crianca.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta criança?")) return;

    try {
      await apiClient.deleteCrianca(id);
      toast({
        title: "Sucesso",
        description: "Criança removida com sucesso!",
      });
      fetchCriancas();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover criança",
        variant: "destructive",
      });
    }
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLocal("all");
    setMinAge("");
    setMaxAge("");
    setSelectedMonth("all");
    setStatusFilter("active");
    setSelectedTagsFilter([]);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedLocal !== "all" ||
    minAge ||
    maxAge ||
    selectedMonth !== "all" ||
    statusFilter !== "active" ||
    selectedTagsFilter.length > 0;

  const filteredCriancas = criancas.filter(crianca => {
    // Filtro de busca por nome ou responsável
    const matchesSearch = crianca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crianca.responsavel.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de status
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? crianca.ativo === true :
      statusFilter === "inactive" ? crianca.ativo === false :
      true;

    // Filtro de local
    const matchesLocal = selectedLocal === "all" ? true : crianca.local_id === selectedLocal;

    // Filtro de faixa etária
    const minAgeNum = minAge ? parseInt(minAge) : null;
    const maxAgeNum = maxAge ? parseInt(maxAge) : null;
    const matchesAge =
      (minAgeNum === null || crianca.idade >= minAgeNum) &&
      (maxAgeNum === null || crianca.idade <= maxAgeNum);

    // Filtro por mês de aniversário
    const matchesMonth = selectedMonth === "all" ? true :
      new Date(crianca.data_nascimento).getMonth() === parseInt(selectedMonth);

    // Filtro por tags (multi-select) - criança deve ter TODAS as tags selecionadas
    const matchesTags = selectedTagsFilter.length === 0 ? true :
      selectedTagsFilter.every(tagId =>
        crianca.tags_saude?.some(ts => ts.tag_id === tagId)
      );

    return matchesSearch && matchesStatus && matchesLocal && matchesAge && matchesMonth &&
           matchesTags;
  });

  // Paginação client-side
  const totalFilteredItems = filteredCriancas.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCriancas = filteredCriancas.slice(startIndex, endIndex);

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedLocal, minAge, maxAge, selectedMonth, selectedTagsFilter]);

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
          <h1 className="text-3xl font-bold tracking-tight">Crianças</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro das crianças beneficiárias
          </p>
        </div>

        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              // Limpar apenas ao fechar
              setEditingCrianca(null);
              form.reset();
              setMostrarResponsavel2(false);
              setMostrarResponsavel3(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCrianca(null);
                setSelectedTags([]);
                form.reset({
                  nome: "",
                  data_nascimento: "",
                  local_id: "",
                  responsavel: "",
                  telefone_responsavel: "",
                  responsavel2: undefined,
                  telefone_responsavel2: undefined,
                  responsavel3: undefined,
                  telefone_responsavel3: undefined,
                  endereco: "",
                  escola: "",
                  numero_escola: undefined,
                  tags_saude: [],
                  observacoes: undefined,
                  ativo: true,
                });
                setMostrarResponsavel2(false);
                setMostrarResponsavel3(false);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Criança
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCrianca ? "Editar Criança" : "Cadastrar Nova Criança"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingCrianca ? "Formulário para editar informações da criança" : "Formulário para cadastrar nova criança no sistema"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Criança</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? stringToLocalDate(field.value) : undefined}
                          onDateChange={(date) => field.onChange(date ? dateToLocalISOString(date) : "")}
                          placeholder="Selecione a data"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="local_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local (Bairro/Unidade)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locais.map((local) => (
                            <SelectItem key={local.id} value={local.id}>
                              {local.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="Nome do responsável" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone_responsavel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone do Responsável</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
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

                {/* Botão para adicionar Responsável 2 */}
                {!mostrarResponsavel2 && form.watch("responsavel") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMostrarResponsavel2(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Responsável 2
                  </Button>
                )}

                {/* Responsável 2 */}
                {mostrarResponsavel2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="responsavel2"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Responsável 2 (Opcional)</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMostrarResponsavel2(false);
                                form.setValue("responsavel2", "");
                                form.setValue("telefone_responsavel2", "");
                              }}
                              className="h-6 px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormControl>
                            <Input placeholder="Nome do segundo responsável" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefone_responsavel2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone do Responsável 2</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              value={field.value || ""}
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

                    {!mostrarResponsavel3 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMostrarResponsavel3(true)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Responsável 3
                      </Button>
                    )}
                  </>
                )}

                {/* Responsável 3 */}
                {mostrarResponsavel3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="responsavel3"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Responsável 3 (Opcional)</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMostrarResponsavel3(false);
                                form.setValue("responsavel3", "");
                                form.setValue("telefone_responsavel3", "");
                              }}
                              className="h-6 px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormControl>
                            <Input placeholder="Nome do terceiro responsável" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefone_responsavel3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone do Responsável 3</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              value={field.value || ""}
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
                  </>
                )}

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
                  name="escola"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escola</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da escola onde estuda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero_escola"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone da Escola (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 0000-0000 ou (00) 00000-0000"
                          {...field}
                          value={field.value || ""}
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

                {/* Seção Tags de Saúde */}
                {tagsSaude.length > 0 && (
                  <>
                    <div className="pt-4 pb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Tags de Saúde</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecione as condições de saúde relevantes para esta criança
                      </p>
                    </div>

                    <div className="space-y-2 border rounded-lg p-4 max-h-48 overflow-y-auto">
                      {tagsSaude.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag.id]);
                              } else {
                                setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            <Badge
                              style={{ backgroundColor: tag.cor || '#6b7280' }}
                              className="text-white text-xs"
                            >
                              {tag.nome}
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações adicionais (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Status da Criança</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {field.value ? (
                            <span className="text-green-600 font-medium">Ativo - Criança frequentando o projeto</span>
                          ) : (
                            <span className="text-gray-500 font-medium">Inativo - Criança não está mais frequentando</span>
                          )}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingCrianca ? "Atualizar" : "Cadastrar"}
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

        {user && user.role === 'admin' && (
          <Button variant="outline" onClick={() => setTagsDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Tags
          </Button>
        )}
      </div>
    </div>

      {/* Filters Card */}
      <Card className="shadow-subtle overflow-hidden">
        <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
          {/* Busca sempre visível */}
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros Avançados - Accordion no mobile, normal no desktop */}
          <div className="block sm:hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="filters" className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filtros Avançados</span>
                    {hasActiveFilters && (
                      <Badge variant="default" className="ml-2 text-xs">
                        {[searchTerm, selectedLocal !== "all", minAge, maxAge, selectedMonth !== "all",
                          statusFilter !== "active", selectedTagsFilter.length > 0].filter(Boolean).length - 1}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <div className="space-y-3">
                    {/* Filtros Básicos */}
                    <div className="grid grid-cols-1 gap-3">
                      <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Filtrar por local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os locais</SelectItem>
                          {locais.map((local) => (
                            <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Idade mín"
                          className="text-sm"
                          value={minAge}
                          onChange={(e) => setMinAge(e.target.value)}
                          min="0"
                          max="18"
                        />
                        <Input
                          type="number"
                          placeholder="Idade máx"
                          className="text-sm"
                          value={maxAge}
                          onChange={(e) => setMaxAge(e.target.value)}
                          min="0"
                          max="18"
                        />
                      </div>

                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Mês de aniversário" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os meses</SelectItem>
                          {months.map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={statusFilter}
                        onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Somente Ativos</SelectItem>
                          <SelectItem value="inactive">Somente Inativos</SelectItem>
                        </SelectContent>
                      </Select>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between w-full font-normal text-sm">
                            {selectedTagsFilter.length > 0
                              ? `${selectedTagsFilter.length} tag(s)`
                              : "Filtrar por tags"}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar tag..." />
                            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {tagsSaude.map((tag) => (
                                <CommandItem
                                  key={tag.id}
                                  onSelect={() => {
                                    setSelectedTagsFilter(prev =>
                                      prev.includes(tag.id)
                                        ? prev.filter(id => id !== tag.id)
                                        : [...prev, tag.id]
                                    );
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                                      selectedTagsFilter.includes(tag.id) ? 'bg-primary border-primary' : 'border-input'
                                    }`}>
                                      {selectedTagsFilter.includes(tag.id) && (
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                      )}
                                    </div>
                                    <Badge style={{ backgroundColor: tag.cor || '#6b7280' }} className="text-white text-xs">
                                      {tag.nome}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Layout Desktop - mantém original */}
          <div className="hidden sm:block space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locais.map((local) => (
                    <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="number" placeholder="Idade mínima" value={minAge} onChange={(e) => setMinAge(e.target.value)} min="0" max="18" />
              <Input type="number" placeholder="Idade máxima" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} min="0" max="18" />

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês de aniversário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Somente Ativos</SelectItem>
                  <SelectItem value="inactive">Somente Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-between w-full font-normal">
                    {selectedTagsFilter.length > 0
                      ? `${selectedTagsFilter.length} tag(s) selecionada(s)`
                      : "Filtrar por tags"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar tag..." />
                    <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {tagsSaude.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => {
                            setSelectedTagsFilter(prev =>
                              prev.includes(tag.id)
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                              selectedTagsFilter.includes(tag.id) ? 'bg-primary border-primary' : 'border-input'
                            }`}>
                              {selectedTagsFilter.includes(tag.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <Badge style={{ backgroundColor: tag.cor || '#6b7280' }} className="text-white text-xs">
                              {tag.nome}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t mt-3">
              <div className="flex items-start sm:items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Filtros ativos:
                </span>

                {searchTerm && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Busca: "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}"
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setSearchTerm("")}
                    />
                  </Badge>
                )}

                {selectedLocal !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Local: {(locais.find(l => l.id === selectedLocal)?.nome || selectedLocal).length > 15
                      ? (locais.find(l => l.id === selectedLocal)?.nome || selectedLocal).substring(0, 15) + '...'
                      : (locais.find(l => l.id === selectedLocal)?.nome || selectedLocal)}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setSelectedLocal("all")}
                    />
                  </Badge>
                )}

                {minAge && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Min: {minAge}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setMinAge("")}
                    />
                  </Badge>
                )}

                {maxAge && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Máx: {maxAge}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setMaxAge("")}
                    />
                  </Badge>
                )}

                {selectedMonth !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {months[parseInt(selectedMonth)].substring(0, 3)}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setSelectedMonth("all")}
                    />
                  </Badge>
                )}

                {statusFilter !== "active" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {statusFilter === "all" ? "Todos" : "Inativos"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setStatusFilter("active")}
                    />
                  </Badge>
                )}

                {selectedTagsFilter.length > 0 && selectedTagsFilter.map(tagId => {
                  const tag = tagsSaude.find(t => t.id === tagId);
                  return tag ? (
                    <Badge
                      key={tagId}
                      style={{ backgroundColor: tag.cor || '#6b7280' }}
                      className="text-white gap-1 text-xs"
                    >
                      {tag.nome}
                      <X
                        className="h-3 w-3 cursor-pointer hover:opacity-80"
                        onClick={() => setSelectedTagsFilter(prev => prev.filter(id => id !== tagId))}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>

              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Limpar Todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-auto w-full">
        {paginatedCriancas.map((crianca) => (
          <Card key={crianca.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Baby className="h-5 w-5 text-primary flex-shrink-0" />
                  <CardTitle className="text-lg truncate">{crianca.nome}</CardTitle>
                </div>
                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  <Badge variant="secondary">{crianca.idade} {crianca.idade === 1 ? 'ano' : 'anos'}</Badge>
                  {crianca.ativo ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-300">Inativo</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {crianca.local && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {crianca.local.nome}
                  </Badge>
                )}
                {/* Tags de Saúde - Máximo 3 */}
                {crianca.tags_saude && crianca.tags_saude.length > 0 && (
                  <>
                    {crianca.tags_saude.slice(0, 3).map((ts) => (
                      <Badge
                        key={ts.id}
                        style={{ backgroundColor: ts.tag.cor || '#6b7280' }}
                        className="text-white text-xs"
                      >
                        {ts.tag.nome}
                      </Badge>
                    ))}
                    {crianca.tags_saude.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{crianca.tags_saude.length - 3}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(crianca.data_nascimento).toLocaleDateString('pt-BR')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{crianca.responsavel}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{formatPhoneInput(crianca.telefone_responsavel || "")}</span>
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span className="flex-1">{crianca.endereco}</span>
              </div>

              {crianca.escola && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">Escola:</span>
                  <span>{crianca.escola}</span>
                </div>
              )}

              {crianca.numero_escola && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>Escola: {formatPhoneInput(crianca.numero_escola)}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCriancaPerfil(crianca);
                      setPerfilDialogOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Perfil
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(crianca)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(crianca.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCriancaHistorico(crianca);
                    limparFiltrosHistorico();
                    setHistoricoDialogOpen(true);
                  }}
                  className="w-full"
                >
                  <History className="h-4 w-4 mr-1" />
                  Histórico de Doações
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controles de Paginação */}
      {filteredCriancas.length > 0 && (
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

      {filteredCriancas.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Baby className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Nenhuma criança encontrada</CardTitle>
            <CardDescription>
              {hasActiveFilters
                ? "Nenhuma criança corresponde aos filtros aplicados. Tente ajustar os critérios de busca."
                : "Comece cadastrando a primeira criança beneficiária."}
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

      {/* Dialog Gerenciar Tags */}
      <GerenciarTags
        open={tagsDialogOpen}
        onOpenChange={setTagsDialogOpen}
        onTagsUpdated={() => {
          // Recarregar lista de tags disponíveis para aparecerem no formulário
          fetchTags();
          // Recarregar lista de crianças para atualizar contagem de tags
          fetchCriancas();
        }}
      />

      {/* Dialog Ver Perfil Completo */}
      <Dialog open={perfilDialogOpen} onOpenChange={setPerfilDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil Completo da Criança</DialogTitle>
            <DialogDescription className="sr-only">
              Informações completas da criança incluindo dados sensíveis e histórico
            </DialogDescription>
          </DialogHeader>
          {criancaPerfil && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Nome</Label>
                    <p className="font-medium">{criancaPerfil.nome}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Idade</Label>
                    <p className="font-medium">{criancaPerfil.idade} {criancaPerfil.idade === 1 ? 'ano' : 'anos'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Data de Nascimento</Label>
                    <p className="font-medium">{new Date(criancaPerfil.data_nascimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Local</Label>
                    <p className="font-medium">{criancaPerfil.local?.nome || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div>
                      {criancaPerfil.ativo ? (
                        <Badge className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Endereço</Label>
                    <p className="font-medium">{criancaPerfil.endereco}</p>
                  </div>
                </div>
              </div>

              {/* Responsáveis */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Responsáveis</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Responsável Principal</Label>
                    <p className="font-medium">{criancaPerfil.responsavel}</p>
                    <p className="text-sm text-muted-foreground">{formatPhoneInput(criancaPerfil.telefone_responsavel || "")}</p>
                  </div>
                  {criancaPerfil.responsavel2 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Responsável 2</Label>
                      <p className="font-medium">{criancaPerfil.responsavel2}</p>
                      {criancaPerfil.telefone_responsavel2 && (
                        <p className="text-sm text-muted-foreground">{formatPhoneInput(criancaPerfil.telefone_responsavel2)}</p>
                      )}
                    </div>
                  )}
                  {criancaPerfil.responsavel3 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Responsável 3</Label>
                      <p className="font-medium">{criancaPerfil.responsavel3}</p>
                      {criancaPerfil.telefone_responsavel3 && (
                        <p className="text-sm text-muted-foreground">{formatPhoneInput(criancaPerfil.telefone_responsavel3)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações Educacionais */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Educação</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Escola</Label>
                    <p className="font-medium">{criancaPerfil.escola || 'Não informado'}</p>
                    {criancaPerfil.numero_escola && (
                      <p className="text-sm text-muted-foreground">{formatPhoneInput(criancaPerfil.numero_escola)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags de Saúde */}
              {criancaPerfil.tags_saude && criancaPerfil.tags_saude.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tags de Saúde</h3>
                  <div className="flex flex-wrap gap-2">
                    {criancaPerfil.tags_saude.map((ts) => (
                      <Badge
                        key={ts.id}
                        style={{ backgroundColor: ts.tag.cor || '#6b7280' }}
                        className="text-white"
                      >
                        {ts.tag.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {criancaPerfil.observacoes && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Observações</h3>
                  <p className="text-sm whitespace-pre-wrap">{criancaPerfil.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => {
                    setPerfilDialogOpen(false);
                    handleEdit(criancaPerfil);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Informações
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPerfilDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico de Doações */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Doações - {criancaHistorico?.nome}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Histórico completo de todas as doações recebidas por esta criança
            </DialogDescription>
          </DialogHeader>

          {/* Estatísticas Resumidas */}
          {historicoDoacoes && historicoDoacoes.historico && historicoDoacoes.historico.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium">Total de Entregas</p>
                <p className="text-3xl font-bold text-primary">
                  {historicoDoacoes.resumo?.total_itens || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium">Última Entrega</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {new Date(historicoDoacoes.historico[0]?.data_entrega).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Filtros Avançados */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">🔍 Filtros</Label>
              {(historicoTipo !== "todos" || historicoDataInicio || historicoDataFim || historicoBuscaTipo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltrosHistorico}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Data Início */}
              <div>
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <DatePicker
                  date={historicoDataInicio ? stringToLocalDate(historicoDataInicio) : undefined}
                  onDateChange={(date) => {
                    setHistoricoDataInicio(date ? dateToLocalISOString(date) : "");
                    setHistoricoPage(1);
                  }}
                  placeholder="Data inicial"
                />
              </div>

              {/* Data Fim */}
              <div>
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <DatePicker
                  date={historicoDataFim ? stringToLocalDate(historicoDataFim) : undefined}
                  onDateChange={(date) => {
                    setHistoricoDataFim(date ? dateToLocalISOString(date) : "");
                    setHistoricoPage(1);
                  }}
                  placeholder="Data final"
                />
              </div>

              {/* Filtro por Tipo */}
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de Doação</Label>
                <Select value={historicoTipo} onValueChange={(value) => {
                  setHistoricoTipo(value);
                  setHistoricoPage(1);
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="Alimentos">Alimentos</SelectItem>
                    <SelectItem value="Roupas">Roupas</SelectItem>
                    <SelectItem value="Presente de Aniversário">Presentes</SelectItem>
                    <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                    <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                    <SelectItem value="Higiene">Higiene</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Busca por Texto */}
              <div>
                <Label className="text-xs text-muted-foreground">Buscar por tipo</Label>
                <Input
                  placeholder="Digite para buscar..."
                  value={historicoBuscaTipo}
                  onChange={(e) => setHistoricoBuscaTipo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Timeline de Entregas */}
          {loadingHistorico ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : historicoDoacoes?.historico && historicoDoacoes.historico.filter((item: any) =>
              !historicoBuscaTipo ||
              item.doacao.tipo_doacao.toLowerCase().includes(historicoBuscaTipo.toLowerCase()) ||
              item.doacao.descricao.toLowerCase().includes(historicoBuscaTipo.toLowerCase()) ||
              item.doacao.doador.toLowerCase().includes(historicoBuscaTipo.toLowerCase())
            ).length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">📅 Timeline de Entregas</Label>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {historicoDoacoes.historico
                  .filter((item: any) =>
                    !historicoBuscaTipo ||
                    item.doacao.tipo_doacao.toLowerCase().includes(historicoBuscaTipo.toLowerCase()) ||
                    item.doacao.descricao.toLowerCase().includes(historicoBuscaTipo.toLowerCase()) ||
                    item.doacao.doador.toLowerCase().includes(historicoBuscaTipo.toLowerCase())
                  )
                  .map((item: any, index: number) => {
                    const dataEntrega = new Date(item.data_entrega);
                    const dataFormatada = dataEntrega.toLocaleDateString('pt-BR');
                    const horaFormatada = dataEntrega.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={item.id} className="relative">
                        {/* Linha conectora */}
                        {index < historicoDoacoes.historico.length - 1 && (
                          <div className="absolute left-[15px] top-[40px] w-[2px] h-full bg-gradient-to-b from-primary/30 to-transparent" />
                        )}

                        <Card className={`hover:shadow-lg transition-all border-l-4 ${
                          item.doacao.tipo_doacao === 'Alimentos' ? 'border-l-green-500 bg-green-50/30' :
                          item.doacao.tipo_doacao === 'Presente de Aniversário' ? 'border-l-pink-500 bg-pink-50/30' :
                          item.doacao.tipo_doacao === 'Roupas' ? 'border-l-blue-500 bg-blue-50/30' :
                          item.doacao.tipo_doacao === 'Brinquedos' ? 'border-l-purple-500 bg-purple-50/30' :
                          'border-l-gray-400 bg-gray-50/30'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Marcador da timeline */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border-4 border-background flex items-center justify-center mt-1">
                                <Package className="h-4 w-4 text-primary" />
                              </div>

                              <div className="flex-1 space-y-2">
                                {/* Data e Hora */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="flex items-center gap-1 font-mono">
                                    <Calendar className="h-3 w-3" />
                                    {dataFormatada}
                                  </Badge>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    🕐 {horaFormatada}
                                  </Badge>
                                  {item.local && (
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {item.local.nome}
                                    </Badge>
                                  )}
                                </div>

                                {/* Tipo de Doação - Badge Grande */}
                                <div>
                                  <Badge
                                    className={`text-sm font-semibold ${
                                      item.doacao.tipo_doacao === 'Alimentos' ? 'bg-green-500 hover:bg-green-600' :
                                      item.doacao.tipo_doacao === 'Presente de Aniversário' ? 'bg-pink-500 hover:bg-pink-600' :
                                      item.doacao.tipo_doacao === 'Roupas' ? 'bg-blue-500 hover:bg-blue-600' :
                                      item.doacao.tipo_doacao === 'Brinquedos' ? 'bg-purple-500 hover:bg-purple-600' :
                                      item.doacao.tipo_doacao === 'Material Escolar' ? 'bg-orange-500 hover:bg-orange-600' :
                                      item.doacao.tipo_doacao === 'Higiene' ? 'bg-cyan-500 hover:bg-cyan-600' :
                                      'bg-gray-500 hover:bg-gray-600'
                                    }`}
                                  >
                                    {item.doacao.tipo_doacao}
                                  </Badge>
                                </div>

                                {/* Descrição e Doador */}
                                <div className="space-y-1">
                                  <h4 className="font-bold text-base text-gray-900">{item.doacao.descricao}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Doador: <span className="font-medium text-gray-700">{item.doacao.doador}</span>
                                  </p>
                                </div>

                                {/* Quantidade */}
                                <div className="flex items-center gap-2 text-sm bg-white/50 rounded px-2 py-1 w-fit">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-primary">
                                    {item.quantidade_consumida} {item.doacao.unidade}
                                  </span>
                                  <span className="text-muted-foreground">recebidos</span>
                                </div>

                                {/* Observações */}
                                {item.observacoes && (
                                  <div className="bg-yellow-50 border-l-2 border-yellow-400 p-2 rounded">
                                    <p className="text-xs text-yellow-800 italic flex items-start gap-1">
                                      <span className="font-semibold">📝 Obs:</span>
                                      {item.observacoes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              <Badge className="bg-green-500 hover:bg-green-600 self-start">
                                ✓ {item.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                }
              </div>

              {/* Paginação */}
              {historicoDoacoes.pagination && historicoDoacoes.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {historicoDoacoes.pagination.page} de {historicoDoacoes.pagination.totalPages}
                    {' '}({historicoDoacoes.pagination.total} itens no total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoricoPage(prev => Math.max(1, prev - 1))}
                      disabled={historicoDoacoes.pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoricoPage(prev => prev + 1)}
                      disabled={historicoDoacoes.pagination.page === historicoDoacoes.pagination.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">Nenhuma doação registrada</CardTitle>
                <CardDescription>
                  Esta criança ainda não recebeu doações registradas no sistema.
                </CardDescription>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setHistoricoDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}