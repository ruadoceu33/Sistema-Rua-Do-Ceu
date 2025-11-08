import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { DatePicker, dateToLocalISOString, stringToLocalDate } from "@/components/ui/date-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Gift, Calendar, User, MapPin, Package, AlertTriangle, Baby, Filter, X, History, Clock, SlidersHorizontal } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateForInput } from "@/lib/dateUtils";

const doacaoSchema = z.object({
  doador: z.string().min(2, "Nome do doador é obrigatório"),
  tipo_doacao: z.string().min(1, "Tipo de doação é obrigatório"),
  quantidade: z.string().optional(),
  unidade: z.string().optional(),
  descricao: z.string().min(5, "Descrição é obrigatória"),
  data_doacao: z.string().min(1, "Data da doação é obrigatória"),
  local_id: z.string().min(1, "Local é obrigatório"),
});

type DoacaoFormData = z.infer<typeof doacaoSchema>;

interface Doacao {
  id: string;
  doador: string;
  tipo_doacao: string;
  quantidade?: number;
  unidade?: string;
  descricao: string;
  data_doacao: string;
  local_id: string;
  total_consumido?: number;
  quantidade_restante?: number;
  local?: {
    id: string;
    nome: string;
    endereco: string;
  };
  _count?: {
    checkins: number;
  };
  destinatarios?: Array<{
    id: string;
    entregue: boolean;
    crianca: {
      id: string;
      nome: string;
      data_nascimento: string;
    };
  }>;
}

interface Local {
  id: string;
  nome: string;
}

interface Crianca {
  id: string;
  nome: string;
  data_nascimento: string;
  local_id: string;
}

export default function Doacoes() {
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPresenteDialogOpen, setIsPresenteDialogOpen] = useState(false);
  const [isEditPresenteDialogOpen, setIsEditPresenteDialogOpen] = useState(false);
  const [editingDoacao, setEditingDoacao] = useState<Doacao | null>(null);
  const [selectedLocalPresente, setSelectedLocalPresente] = useState<string>("");
  const [selectedCrianca, setSelectedCrianca] = useState<string>("");
  const [presenteData, setPresenteData] = useState({
    doador: "",
    descricao: "",
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Filtros
  const [filterTipo, setFilterTipo] = useState<string>("all"); // all, presentes, doacoes
  const [filterLocal, setFilterLocal] = useState<string>("all");
  const [filterMes, setFilterMes] = useState<number | undefined>(undefined);
  const [filterAno, setFilterAno] = useState<number>(new Date().getFullYear());

  // Estados para histórico de consumo
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [historicoConsumo, setHistoricoConsumo] = useState<any>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [historicoDataInicio, setHistoricoDataInicio] = useState("");
  const [historicoDataFim, setHistoricoDataFim] = useState("");
  const [historicoBuscaCrianca, setHistoricoBuscaCrianca] = useState("");
  const [doacaoHistorico, setDoacaoHistorico] = useState<Doacao | null>(null);

  const form = useForm<DoacaoFormData>({
    resolver: zodResolver(doacaoSchema),
    defaultValues: {
      doador: "",
      tipo_doacao: "",
      quantidade: "",
      unidade: "",
      descricao: "",
      data_doacao: dateToLocalISOString(new Date()),
      local_id: "",
    },
  });

  const fetchDoacoes = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getDoacoes();
      const data = result.data || result || [];
      setDoacoes(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar doações",
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

  const fetchCriancas = async () => {
    try {
      const result = await apiClient.getCriancas({ ativo: true });
      const data = result.data || result || [];
      setCriancas(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar crianças",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDoacoes(), fetchLocais(), fetchCriancas()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const onSubmit = async (data: DoacaoFormData) => {
    try {
      const doacaoData = {
        doador: data.doador,
        tipo_doacao: data.tipo_doacao,
        quantidade: data.quantidade ? parseInt(data.quantidade) : null,
        unidade: data.unidade || null,
        descricao: data.descricao,
        data_doacao: data.data_doacao,
        local_id: data.local_id,
      };

      if (editingDoacao) {
        await apiClient.updateDoacao(editingDoacao.id, doacaoData);
        toast({
          title: "Sucesso",
          description: "Doação atualizada com sucesso!",
        });
      } else {
        await apiClient.createDoacao(doacaoData);
        toast({
          title: "Sucesso",
          description: "Doação cadastrada com sucesso!",
        });
      }

      await fetchDoacoes();
      setIsDialogOpen(false);
      setEditingDoacao(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar doação",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (doacao: Doacao) => {
    setEditingDoacao(doacao);

    // Se for presente de aniversário, abrir modal específico
    if (doacao.tipo_doacao === "Presente de Aniversário") {
      setSelectedLocalPresente(doacao.local_id);
      if (doacao.destinatarios && doacao.destinatarios[0]) {
        setSelectedCrianca(doacao.destinatarios[0].crianca.id);
      }
      setPresenteData({
        doador: doacao.doador,
        descricao: doacao.descricao || "",
      });
      setIsEditPresenteDialogOpen(true);
    } else {
      // Modal de doação normal
      form.reset({
        doador: doacao.doador,
        tipo_doacao: doacao.tipo_doacao,
        // Campo quantidade sempre VAZIO ao editar - você digita quanto quer ADICIONAR
        quantidade: "",
        // Unidade deve ser preenchida com a unidade atual (ou vazia se não existir)
        unidade: doacao.unidade || "",
        descricao: doacao.descricao,
        data_doacao: formatDateForInput(doacao.data_doacao),
        local_id: doacao.local_id,
      });
      setIsDialogOpen(true);
    }
  };

  const handleUpdatePresente = async () => {
    if (!editingDoacao || !selectedLocalPresente || !selectedCrianca || !presenteData.doador || !presenteData.descricao) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.updateDoacao(editingDoacao.id, {
        doador: presenteData.doador,
        tipo_doacao: "Presente de Aniversário",
        descricao: presenteData.descricao,
        data_doacao: editingDoacao.data_doacao,
        local_id: selectedLocalPresente,
      });

      toast({
        title: "Sucesso",
        description: "Presente atualizado com sucesso!",
      });

      await fetchDoacoes();
      setIsEditPresenteDialogOpen(false);
      setEditingDoacao(null);
      setSelectedLocalPresente("");
      setSelectedCrianca("");
      setPresenteData({ doador: "", descricao: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar presente",
        variant: "destructive",
      });
    }
  };

  // Função para buscar histórico de consumo
  const fetchHistoricoConsumo = async (doacaoId: string) => {
    try {
      setLoadingHistorico(true);
      const data = await apiClient.getHistoricoConsumoDoacao(doacaoId, {
        page: historicoPage,
        limit: 20,
        data_inicio: historicoDataInicio || undefined,
        data_fim: historicoDataFim || undefined
      });
      setHistoricoConsumo(data);
    } catch (error) {
      console.error('Erro ao buscar histórico de consumo:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de consumo",
        variant: "destructive",
      });
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Recarregar histórico quando página ou filtros mudarem
  useEffect(() => {
    if (historicoDialogOpen && doacaoHistorico) {
      fetchHistoricoConsumo(doacaoHistorico.id);
    }
  }, [historicoPage, historicoDataInicio, historicoDataFim, historicoDialogOpen]);

  // Função para limpar filtros do histórico
  const limparFiltrosHistorico = () => {
    setHistoricoDataInicio("");
    setHistoricoDataFim("");
    setHistoricoBuscaCrianca("");
    setHistoricoPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta doação?")) return;

    try {
      await apiClient.deleteDoacao(id);
      toast({
        title: "Sucesso",
        description: "Doação removida com sucesso!",
      });
      await fetchDoacoes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover doação",
        variant: "destructive",
      });
    }
  };

  const handleSalvarPresente = async () => {
    if (!selectedLocalPresente || !selectedCrianca || !presenteData.doador || !presenteData.descricao) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar doação do tipo "Presente de Aniversário"
      const doacaoData: any = {
        doador: presenteData.doador,
        tipo_doacao: "Presente de Aniversário",
        descricao: presenteData.descricao,
        data_doacao: dateToLocalISOString(new Date()),
        local_id: selectedLocalPresente,
        criancas_destinatarias: [selectedCrianca], // Array com ID da criança destinatária
      };

      await apiClient.createDoacao(doacaoData);

      toast({
        title: "Sucesso",
        description: "Presente registrado com sucesso!",
      });

      await fetchDoacoes();
      setIsPresenteDialogOpen(false);
      setSelectedLocalPresente("");
      setSelectedCrianca("");
      setPresenteData({ doador: "", descricao: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar presente",
        variant: "destructive",
      });
    }
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterTipo("all");
    setFilterLocal("all");
    setFilterMes(undefined);
    setFilterAno(new Date().getFullYear());
  };

  const hasActiveFilters = searchTerm || filterTipo !== "all" || filterLocal !== "all" || filterMes !== undefined;

  const filteredDoacoes = doacoes.filter(doacao => {
    // Filtro de busca
    const matchesSearch = doacao.doador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doacao.tipo_doacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doacao.descricao && doacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro de tipo
    let matchesTipo = true;
    if (filterTipo === "presentes") {
      matchesTipo = doacao.tipo_doacao === "Presente de Aniversário";
    } else if (filterTipo === "doacoes") {
      matchesTipo = doacao.tipo_doacao !== "Presente de Aniversário";
    }

    // Filtro de local
    const matchesLocal = filterLocal === "all" || doacao.local_id === filterLocal;

    // Filtro de mês/ano
    let matchesDate = true;
    if (filterMes !== undefined) {
      const doacaoDate = new Date(doacao.data_doacao);
      matchesDate = doacaoDate.getMonth() === filterMes && doacaoDate.getFullYear() === filterAno;
    }

    return matchesSearch && matchesTipo && matchesLocal && matchesDate;
  });

  // Paginação client-side
  const totalFilteredItems = filteredDoacoes.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDoacoes = filteredDoacoes.slice(startIndex, endIndex);

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterLocal, filterMes, filterAno]);

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
          <h1 className="text-3xl font-bold tracking-tight">Doações</h1>
          <p className="text-muted-foreground">
            Registre intenções de doação para os locais
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingDoacao(null);
                form.reset();
              }} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Registrar Doação</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoacao ? "Editar Intenção de Doação" : "Registrar Nova Intenção de Doação"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingDoacao ? "Formulário para editar informações da doação" : "Formulário para registrar nova intenção de doação"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="doador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doador</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do doador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo_doacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Doação</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Alimentos">Alimentos</SelectItem>
                          <SelectItem value="Roupas">Roupas</SelectItem>
                          <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                          <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                          <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={editingDoacao ? "Digite a quantidade para adicionar ao estoque" : "Ex: 40"}
                          {...field}
                        />
                      </FormControl>
                      {editingDoacao && editingDoacao.quantidade !== null && editingDoacao.quantidade !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Estoque atual: {editingDoacao.quantidade_restante || 0} {editingDoacao.unidade || "unidades"}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unidade de medida" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unidades">Unidades</SelectItem>
                          <SelectItem value="kg">Quilogramas</SelectItem>
                          <SelectItem value="litros">Litros</SelectItem>
                          <SelectItem value="caixas">Caixas</SelectItem>
                          <SelectItem value="pacotes">Pacotes</SelectItem>
                          <SelectItem value="sacos">Sacos</SelectItem>
                          <SelectItem value="pares">Pares</SelectItem>
                          <SelectItem value="metros">Metros</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_doacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Doação</FormLabel>
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
                      <FormLabel>Local</FormLabel>
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
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva a doação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingDoacao ? "Atualizar" : "Cadastrar"}
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

          <Dialog open={isPresenteDialogOpen} onOpenChange={setIsPresenteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedLocalPresente("");
                  setSelectedCrianca("");
                  setPresenteData({ doador: "", descricao: "" });
                }}
                className="w-full sm:w-auto"
              >
                <Gift className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Presentear Criança</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Presentear Criança</DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para registrar presente de aniversário
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="local-presente">Local</Label>
                  <Select value={selectedLocalPresente} onValueChange={setSelectedLocalPresente}>
                    <SelectTrigger id="local-presente">
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locais.map((local) => (
                        <SelectItem key={local.id} value={local.id}>
                          {local.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crianca-presente">Criança</Label>
                  <Select
                    value={selectedCrianca}
                    onValueChange={setSelectedCrianca}
                    disabled={!selectedLocalPresente}
                  >
                    <SelectTrigger id="crianca-presente">
                      <SelectValue placeholder="Selecione a criança" />
                    </SelectTrigger>
                    <SelectContent>
                      {criancas
                        .filter((c) => c.local_id === selectedLocalPresente)
                        .map((crianca) => (
                          <SelectItem key={crianca.id} value={crianca.id}>
                            {crianca.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doador-presente">Doador</Label>
                  <Input
                    id="doador-presente"
                    placeholder="Nome do doador"
                    value={presenteData.doador}
                    onChange={(e) =>
                      setPresenteData({ ...presenteData, doador: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao-presente">Descrição do Presente</Label>
                  <Textarea
                    id="descricao-presente"
                    placeholder="Descreva o presente..."
                    value={presenteData.descricao}
                    onChange={(e) =>
                      setPresenteData({ ...presenteData, descricao: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSalvarPresente} className="flex-1">
                    Salvar Presente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPresenteDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição de Presente */}
          <Dialog open={isEditPresenteDialogOpen} onOpenChange={setIsEditPresenteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Presente de Aniversário</DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para editar presente de aniversário
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="local-presente-edit">Local</Label>
                  <Select value={selectedLocalPresente} onValueChange={setSelectedLocalPresente} disabled>
                    <SelectTrigger id="local-presente-edit">
                      <SelectValue placeholder="Selecione o local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locais.map((local) => (
                        <SelectItem key={local.id} value={local.id}>
                          {local.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">O local não pode ser alterado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crianca-presente-edit">Criança</Label>
                  <Select value={selectedCrianca} onValueChange={setSelectedCrianca} disabled>
                    <SelectTrigger id="crianca-presente-edit">
                      <SelectValue placeholder="Selecione a criança" />
                    </SelectTrigger>
                    <SelectContent>
                      {criancas
                        .filter((c) => c.local_id === selectedLocalPresente)
                        .map((crianca) => (
                          <SelectItem key={crianca.id} value={crianca.id}>
                            {crianca.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">A criança destinatária não pode ser alterada</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doador-presente-edit">Doador</Label>
                  <Input
                    id="doador-presente-edit"
                    placeholder="Nome do doador"
                    value={presenteData.doador}
                    onChange={(e) =>
                      setPresenteData({ ...presenteData, doador: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao-presente-edit">Descrição do Presente</Label>
                  <Textarea
                    id="descricao-presente-edit"
                    placeholder="Descreva o presente..."
                    value={presenteData.descricao}
                    onChange={(e) =>
                      setPresenteData({ ...presenteData, descricao: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdatePresente} className="flex-1">
                    Atualizar Presente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditPresenteDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card className="shadow-subtle overflow-hidden">
        <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
          {/* Busca sempre visível */}
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por doador, tipo ou descrição..."
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
                        {[searchTerm, filterTipo !== "all", filterLocal !== "all", filterMes !== undefined].filter(Boolean).length - 1}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <div className="space-y-3">
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="presentes">Presentes de Aniversário</SelectItem>
                        <SelectItem value="doacoes">Doações Normais</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterLocal} onValueChange={setFilterLocal}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Filtrar por local" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os locais</SelectItem>
                        {locais.map((local) => (
                          <SelectItem key={local.id} value={local.id}>
                            {local.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filterMes?.toString() || "all"}
                      onValueChange={(value) => setFilterMes(value === "all" ? undefined : parseInt(value))}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Mês específico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filterAno.toString()}
                      onValueChange={(value) => setFilterAno(parseInt(value))}
                      disabled={filterMes === undefined}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Layout Desktop - mantém original */}
          <div className="hidden sm:block space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="presentes">Presentes de Aniversário</SelectItem>
                  <SelectItem value="doacoes">Doações Normais</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLocal} onValueChange={setFilterLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locais.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterMes?.toString() || "all"}
                onValueChange={(value) => setFilterMes(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mês específico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterAno.toString()}
                onValueChange={(value) => setFilterAno(parseInt(value))}
                disabled={filterMes === undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

                {filterTipo !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {filterTipo === "presentes" ? "Presentes" : "Doações"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterTipo("all")}
                    />
                  </Badge>
                )}

                {filterLocal !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    Local: {(locais.find(l => l.id === filterLocal)?.nome || filterLocal).length > 15
                      ? (locais.find(l => l.id === filterLocal)?.nome || filterLocal).substring(0, 15) + '...'
                      : (locais.find(l => l.id === filterLocal)?.nome || filterLocal)}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterLocal("all")}
                    />
                  </Badge>
                )}

                {filterMes !== undefined && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {months[filterMes].substring(0, 3)}/{filterAno}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setFilterMes(undefined);
                        setFilterAno(new Date().getFullYear());
                      }}
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
        {paginatedDoacoes.map((doacao) => {
          const isPresente = doacao.tipo_doacao === "Presente de Aniversário";

          return isPresente ? (
            // Card de Presente
            <Card key={doacao.id} className="hover:shadow-md transition-shadow border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden w-full min-w-0">
              <CardHeader className="pb-3 px-3 sm:px-6">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                    <CardTitle className="text-sm sm:text-lg text-amber-900 truncate min-w-0">Presente de Aniversário</CardTitle>
                  </div>
                  <Badge className="bg-amber-600 text-xs shrink-0 whitespace-nowrap">Presente</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
                {/* Nome da criança destinatária */}
                {doacao.destinatarios && doacao.destinatarios.length > 0 && (
                  <div className="bg-white/80 p-2 rounded border border-amber-300 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
                      <Baby className="h-4 w-4 shrink-0" />
                      <span className="font-semibold shrink-0">Para:</span>
                      <span className="font-medium truncate">{doacao.destinatarios[0].crianca.nome}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="font-medium shrink-0">Doador:</span>
                  <span className="truncate">{doacao.doador}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="break-words">{new Date(doacao.data_doacao).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{doacao.local?.nome || 'Sem local'}</span>
                </div>

                <div className="text-sm text-amber-900 bg-white/60 p-2 rounded min-w-0 break-words">
                  <strong>Presente:</strong> {doacao.descricao}
                </div>

                {/* Status de entrega */}
                {doacao.destinatarios && doacao.destinatarios[0]?.entregue ? (
                  <Badge className="w-full justify-center bg-green-600">
                    Entregue
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="w-full justify-center">
                    Pendente Entrega
                  </Badge>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(doacao)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    {(!doacao.destinatarios || !doacao.destinatarios[0]?.entregue) && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          // Redirecionar para check-in com dados do presente
                          if (doacao.destinatarios && doacao.destinatarios[0]) {
                            window.location.href = `/checkin?doacao_id=${doacao.id}&crianca_id=${doacao.destinatarios[0].crianca.id}&tipo=presente`;
                          }
                        }}
                      >
                        <Gift className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Check-in</span>
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDoacaoHistorico(doacao);
                        limparFiltrosHistorico();
                        setHistoricoDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <History className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Histórico</span>
                    </Button>
                    {/* Botão deletar - apenas se pendente */}
                    {(!doacao.destinatarios || !doacao.destinatarios[0]?.entregue) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doacao.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Deletar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Card normal de doação
          <Card key={doacao.id} className="hover:shadow-md transition-shadow overflow-hidden w-full min-w-0">
            <CardHeader className="pb-3 px-3 sm:px-6">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <CardTitle className="text-sm sm:text-lg truncate min-w-0">{doacao.tipo_doacao}</CardTitle>
                </div>
                {(doacao.quantidade && doacao.unidade) && (
                  <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[80px]">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="hidden sm:inline text-right">Estoque Atual</span>
                      <span className="sm:hidden">Estoque</span>
                    </div>
                    <div className={`flex items-center gap-1 font-bold text-xs sm:text-sm ${
                      (doacao.quantidade_restante || 0) === 0
                        ? 'text-red-600'
                        : (doacao.quantidade_restante || 0) <= (doacao.quantidade * 0.2)
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      <span className="break-words text-right">{doacao.quantidade_restante !== undefined ? doacao.quantidade_restante : doacao.quantidade} {doacao.unidade}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{doacao.doador}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="break-words">{new Date(doacao.data_doacao).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{doacao.local?.nome || 'Sem local'}</span>
              </div>

              {/* Estoque Disponível */}
              {doacao.quantidade !== undefined && doacao.quantidade !== null && (
                <div className="flex items-center justify-between bg-muted/50 p-2 sm:p-3 rounded-lg gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">Estoque Disponível:</span>
                  </div>
                  <div className={`text-xs sm:text-sm font-bold shrink-0 ${
                    (doacao.quantidade_restante || 0) === 0
                      ? 'text-red-600'
                      : (doacao.quantidade_restante || 0) <= (doacao.quantidade * 0.2)
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}>
                    {doacao.quantidade_restante || 0} {doacao.unidade}
                  </div>
                </div>
              )}

              {/* Badge de Alerta de Estoque Baixo */}
              {doacao.quantidade !== undefined &&
               doacao.quantidade_restante !== undefined &&
               doacao.quantidade_restante === 0 && (
                <Badge variant="destructive" className="w-full justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Estoque Esgotado
                </Badge>
              )}

              {doacao.quantidade !== undefined &&
               doacao.quantidade_restante !== undefined &&
               doacao.quantidade_restante > 0 &&
               doacao.quantidade_restante <= (doacao.quantidade * 0.2) && (
                <Badge variant="outline" className="w-full justify-center gap-1 border-yellow-500 text-yellow-700">
                  <AlertTriangle className="h-3 w-3" />
                  Estoque Baixo
                </Badge>
              )}

              <div className="text-sm text-muted-foreground bg-muted p-2 rounded min-w-0 break-words">
                {doacao.descricao}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(doacao)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(doacao.id)}
                    className="text-destructive hover:text-destructive px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDoacaoHistorico(doacao);
                    limparFiltrosHistorico();
                    setHistoricoDialogOpen(true);
                  }}
                  className="w-full"
                >
                  <History className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Histórico</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
      </div>

      {/* Controles de Paginação */}
      {filteredDoacoes.length > 0 && (
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

      {filteredDoacoes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Nenhuma doação encontrada</CardTitle>
            <CardDescription>
              {searchTerm
                ? "Nenhuma doação corresponde aos critérios de busca."
                : "Comece cadastrando a primeira doação."}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Dialog Histórico de Consumo */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Consumo - {doacaoHistorico?.tipo_doacao}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Histórico completo de consumo desta doação
            </DialogDescription>
          </DialogHeader>

          {/* Estatísticas Resumidas */}
          {historicoConsumo && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium">Total de Entregas</p>
                <p className="text-3xl font-bold text-primary">
                  {historicoConsumo.resumo?.total_entregas || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground font-medium">Última Entrega</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {historicoConsumo.historico && historicoConsumo.historico[0]
                    ? new Date(historicoConsumo.historico[0].data_consumo).toLocaleDateString('pt-BR')
                    : '-'}
                </p>
              </div>
            </div>
          )}

          {/* Filtros Avançados */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">🔍 Filtros</Label>
              {(historicoDataInicio || historicoDataFim || historicoBuscaCrianca) && (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

              {/* Busca por Criança */}
              <div>
                <Label className="text-xs text-muted-foreground">Buscar criança</Label>
                <Input
                  placeholder="Nome da criança..."
                  value={historicoBuscaCrianca}
                  onChange={(e) => setHistoricoBuscaCrianca(e.target.value)}
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
          ) : historicoConsumo?.historico && historicoConsumo.historico.filter((item: any) =>
              !historicoBuscaCrianca ||
              item.crianca.nome.toLowerCase().includes(historicoBuscaCrianca.toLowerCase())
            ).length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">📅 Timeline de Entregas</Label>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {historicoConsumo.historico
                  .filter((item: any) =>
                    !historicoBuscaCrianca ||
                    item.crianca.nome.toLowerCase().includes(historicoBuscaCrianca.toLowerCase())
                  )
                  .map((item: any, index: number) => {
                    const dataConsumo = new Date(item.data_consumo);
                    const dataFormatada = dataConsumo.toLocaleDateString('pt-BR');
                    const horaFormatada = dataConsumo.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={item.id} className="relative">
                        {/* Linha conectora */}
                        {index < historicoConsumo.historico.length - 1 && (
                          <div className="absolute left-[15px] top-[40px] w-[2px] h-full bg-gradient-to-b from-primary/30 to-transparent" />
                        )}

                        <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary/60 bg-primary/5">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Marcador da timeline */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border-4 border-background flex items-center justify-center mt-1">
                                <Baby className="h-4 w-4 text-primary" />
                              </div>

                              <div className="flex-1 space-y-2">
                                {/* Data e Hora */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="flex items-center gap-1 font-mono">
                                    <Calendar className="h-3 w-3" />
                                    {dataFormatada}
                                  </Badge>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {horaFormatada}
                                  </Badge>
                                  {item.local && (
                                    <Badge variant="outline" className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {item.local.nome}
                                    </Badge>
                                  )}
                                </div>

                                {/* Nome da Criança */}
                                <div>
                                  <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                    <Baby className="h-5 w-5 text-primary" />
                                    {item.crianca.nome}
                                    <span className="text-sm text-muted-foreground font-normal">
                                      ({item.crianca.idade} anos)
                                    </span>
                                  </h4>
                                </div>

                                {/* Quantidade Recebida */}
                                <div className="flex items-center gap-2 text-sm bg-white/50 rounded px-2 py-1 w-fit">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-primary">
                                    {item.quantidade_consumida} {doacaoHistorico?.unidade || 'unidade(s)'}
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
                                ✓ Entregue
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
              {historicoConsumo.pagination && historicoConsumo.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {historicoConsumo.pagination.page} de {historicoConsumo.pagination.totalPages}
                    {' '}({historicoConsumo.pagination.total} entregas no total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoricoPage(prev => Math.max(1, prev - 1))}
                      disabled={historicoConsumo.pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoricoPage(prev => prev + 1)}
                      disabled={historicoConsumo.pagination.page === historicoConsumo.pagination.totalPages}
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
                <CardTitle className="mb-2">Nenhuma entrega registrada</CardTitle>
                <CardDescription>
                  Esta doação ainda não teve consumo registrado no sistema.
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