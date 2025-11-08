// Importa hooks essenciais do React para gerenciar estado (useState) e efeitos colaterais (useEffect).
import { useState, useEffect } from "react";
// Importa componentes de UI (User Interface) da biblioteca local (@/components/ui) para construir a interface do usuário.
// Estes componentes são reutilizáveis, padronizados e seguem um sistema de design.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Componentes para exibir conteúdo em formato de cartão.
import { Button } from "@/components/ui/button"; // Botões interativos.
import { Input } from "@/components/ui/input"; // Campos de entrada de texto.
import { Label } from "@/components/ui/label"; // Rótulos para campos de formulário.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Componentes para seleção de opções em um dropdown.
import { Textarea } from "@/components/ui/textarea"; // Campo de texto multi-linha.
import { Checkbox } from "@/components/ui/checkbox"; // Caixas de seleção.
import { Badge } from "@/components/ui/badge"; // Componentes visuais para exibir status ou pequenas informações.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Componentes para criar modais/pop-ups.
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Componentes para construção e validação de formulários.
// Importa hooks e resolvedores para gerenciamento de formulários com validação robusta.
import { useForm } from "react-hook-form"; // Hook principal para gerenciar formulários.
import { zodResolver } from "@hookform/resolvers/zod"; // Integrador do React Hook Form com a biblioteca Zod para validação.
// Importa a biblioteca Zod para definição de schemas de validação de dados. É usada para garantir que os dados do formulário estejam no formato correto.
import { z } from "zod";
// Importa hooks do React Query para invalidação de cache após mutações
import { useQueryClient, useMutation } from "@tanstack/react-query";
// Importa ícones da biblioteca lucide-react para uso visual na interface, melhorando a usabilidade.
import { Plus, Search, Clock, UserCheck, Baby, MapPin, Calendar, Users, Gift, CheckCircle2, XCircle, Filter, X, Trash2, SlidersHorizontal } from "lucide-react";
// Componentes para criar seções expansíveis (acordeão).
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// Componente customizado para controles de paginação.
import { PaginationControls } from "@/components/ui/pagination-controls";
// Importa a instância do cliente da API para fazer requisições ao backend. Facilita a comunicação com o servidor.
import { apiClient } from "@/lib/api";
// Importa a função toast para exibir notificações (mensagens de sucesso/erro) ao usuário.
import { toast } from "@/hooks/use-toast";
// Importa função utilitária para converter Date para string sem bug de timezone.
import { dateToLocalISOString } from "@/components/ui/date-picker";

// Define o schema de validação para o formulário de check-in em lote usando Zod.
// Isso garante que os dados enviados para o backend estejam no formato esperado e sejam válidos.
const checkinLoteSchema = z.object({
  // local_id é obrigatório e deve ser uma string não vazia.
  local_id: z.string().min(1, "Local é obrigatório"),
  // doacao_id é opcional, pode ser uma string ou undefined.
  doacao_id: z.string().optional(),
  // observacoes_gerais é opcional, para anotações que se aplicam a todos os check-ins do lote.
  observacoes_gerais: z.string().optional(),
  // presencas é um array de objetos, cada um representando o status de presença de uma criança.
  // Deve conter pelo menos um item.
  presencas: z.array(z.object({
    crianca_id: z.string(), // ID da criança.
    presente: z.boolean(), // Indica se a criança está presente (true) ou ausente (false).
    observacoes: z.string().optional(), // Observações específicas para esta criança.
    quantidade_consumida: z.number().min(1).optional(), // Quantidade de item consumido, se houver doação.
  })).min(1, "Selecione pelo menos uma criança"), // Garante que pelo menos uma criança seja selecionada.
});

// Define o tipo TypeScript para os dados do formulário de check-in em lote, inferindo-o do schema Zod.
// Isso proporciona segurança de tipo durante o desenvolvimento.
// Define o tipo TypeScript para os dados do formulário de check-in em lote, inferindo-o do schema Zod.
// Isso proporciona segurança de tipo durante o desenvolvimento.
type CheckinLoteFormData = z.infer<typeof checkinLoteSchema>;

// Define a estrutura de dados (interface) para um único registro de Check-in.
// Interfaces são contratos que garantem que os objetos terão as propriedades esperadas, com os tipos corretos.
interface Checkin {
  id: string; // Identificador único do check-in.
  crianca_id: string; // ID da criança associada a este check-in.
  local_id: string; // ID do local onde o check-in foi realizado.
  sessao_id?: string; // ID da sessão de check-in (opcional, para agrupar check-ins).
  presente: boolean; // Indica se a criança estava presente (true) ou ausente (false).
  data_checkin: string; // Data e hora em que o check-in foi registrado.
  observacoes?: string; // Observações adicionais sobre o check-in (opcional).
  doacao_id?: string; // ID da doação relacionada, se houver (opcional).
  quantidade_consumida?: number; // Quantidade de item consumido, se houver doação.
  crianca?: { // Objeto aninhado com informações básicas da criança (opcional).
    nome: string;
    idade: number;
  };
  local?: { // Objeto aninhado com informações básicas do local (opcional).
    nome: string;
  };
  doacao?: { // Objeto aninhado com informações básicas da doação (opcional).
    tipo_doacao: string;
    doador: string;
    descricao?: string;
  };
}

// Define a estrutura de dados para uma sessão de Check-in, que agrupa múltiplos check-ins.
interface SessaoCheckin {
  sessao_id: string; // Identificador único da sessão de check-in.
  local_id: string; // ID do local onde a sessão ocorreu.
  local: { // Informações do local da sessão.
    nome: string;
  };
  data_checkin: string; // Data e hora da sessão.
  doacao?: { // Informações da doação associada à sessão, se houver.
    tipo_doacao: string;
    doador: string;
    descricao?: string;
  };
  presentes: Checkin[]; // Lista de check-ins de crianças presentes nesta sessão.
  ausentes: Checkin[]; // Lista de check-ins de crianças ausentes nesta sessão.
  total: number; // Número total de crianças nesta sessão.
}

// Define a estrutura de dados para uma Criança.
interface Crianca {
  id: string; // ID da criança.
  nome: string; // Nome da criança.
  idade: number; // Idade da criança.
  local_id: string; // ID do local ao qual a criança está vinculada.
}

// Define a estrutura de dados para um Local.
interface Local {
  id: string; // ID do local.
  nome: string; // Nome do local.
}

// Define a estrutura de dados para uma Doação.
interface Doacao {
  id: string; // ID da doação.
  tipo_doacao: string; // Tipo da doação (ex: 'Alimento', 'Brinquedo', 'Presente de Aniversário').
  doador: string; // Nome do doador.
  descricao: string; // Descrição detalhada da doação.
  quantidade?: number; // Quantidade total do item doado (opcional).
  unidade?: string; // Unidade de medida da doação (ex: 'kg', 'unidades') (opcional).
  total_consumido?: number; // Quantidade total já consumida desta doação (opcional).
  quantidade_restante?: number; // Quantidade restante em estoque (opcional).
  data_doacao: string; // Data em que a doação foi realizada.
  local_id: string; // ID do local onde a doação foi recebida.
  local?: { // Informações do local da doação (opcional).
    nome: string;
  };
  destinatarios?: Array<{ // Lista de destinatários da doação, se aplicável (ex: presentes de aniversário).
    id: string;
    entregue: boolean; // Indica se a doação foi entregue ao destinatário.
    crianca: { // Informações da criança destinatária.
      id: string;
      nome: string;
      data_nascimento: string;
    };
  }>;
}

export default function CheckIn() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateToLocalISOString(new Date()));
  const [selectedLocal, setSelectedLocal] = useState<string>("");
  const [criancasDoLocal, setCriancasDoLocal] = useState<Crianca[]>([]);
  const [presencas, setPresencas] = useState<{ [key: string]: { presente: boolean; observacoes: string; quantidade_consumida: number | string } }>({});

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(16); // 16 para grid 2 colunas

  // Filtros adicionais
  const [filterLocal, setFilterLocal] = useState<string>("all");
  const [filterDoacao, setFilterDoacao] = useState<string>("all"); // all, com_doacao, sem_doacao
  const [filterTipoDoacao, setFilterTipoDoacao] = useState<string>("all");
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterAno, setFilterAno] = useState<string>("all");

  // Check-in de presente
  const [isPresenteDialogOpen, setIsPresenteDialogOpen] = useState(false);
  const [presentesPendentes, setPresentesPendentes] = useState<Doacao[]>([]);
  const [selectedPresenteId, setSelectedPresenteId] = useState<string>("");
  const [observacoesPresenteEntrega, setObservacoesPresenteEntrega] = useState("");

  // React Query client para invalidação de cache
  const queryClient = useQueryClient();

  // Mutation para deletar sessão de check-in
  const deleteSessaoMutation = useMutation({
    mutationFn: async (sessaoId: string) => {
      // Encontrar todos os check-ins da sessão diretamente do estado
      const checkinsParaDeletar = checkins.filter(c =>
        (c.sessao_id || c.id) === sessaoId
      );

      if (checkinsParaDeletar.length === 0) {
        throw new Error('Nenhum check-in encontrado para esta sessão');
      }

      // Deletar cada check-in
      await Promise.all(
        checkinsParaDeletar.map(checkin => apiClient.deleteCheckin(checkin.id))
      );

      return { sessaoId, totalDeleted: checkinsParaDeletar.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: `Sessão de check-in deletada com sucesso (${data.totalDeleted} registros removidos)`,
      });

      // Atualizar lista de check-ins
      fetchCheckins();

      // Invalidar cache do dashboard para atualizar estatísticas
      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active' // Força refetch imediato se query está ativa
      });
    },
    onError: (error: any) => {
      console.error('Erro ao deletar sessão:', error);
      toast({
        title: "Erro",
        description: error?.response?.data?.error?.message || "Erro ao deletar sessão de check-in",
        variant: "destructive",
      });
    },
  });

  // Dialog de visualização de check-in
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSessao, setSelectedSessao] = useState<SessaoCheckin | null>(null);

  const form = useForm<CheckinLoteFormData>({
    resolver: zodResolver(checkinLoteSchema),
    defaultValues: {
      local_id: "",
      doacao_id: "",
      observacoes_gerais: "",
      presencas: [],
    },
  });

  const fetchCheckins = async () => {
    try {
      const result = await apiClient.getCheckins({
        start_date: `${selectedDate}T00:00:00`,
        end_date: `${selectedDate}T23:59:59`
      });
      const data = result.data || result || [];
      setCheckins(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar check-ins",
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

  const fetchDoacoes = async () => {
    try {
      const result = await apiClient.getDoacoes();
      const data = result.data || result || [];
      setDoacoes(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar doações",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCriancas(), fetchLocais(), fetchDoacoes()]);
      await fetchPresentesPendentes();
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchPresentesPendentes = async () => {
    try {
      const result = await apiClient.getDoacoes();
      const data = result.data || result || [];
      // Filtrar apenas presentes de aniversário que ainda não foram entregues
      const presentes = data.filter((d: Doacao) =>
        d.tipo_doacao === "Presente de Aniversário" &&
        d.destinatarios &&
        d.destinatarios.length > 0 &&
        !d.destinatarios[0].entregue // Apenas se não foi entregue
      );
      setPresentesPendentes(presentes);
    } catch (error) {
      console.error("Erro ao carregar presentes pendentes:", error);
    }
  };


  useEffect(() => {
    if (!loading) {
      fetchCheckins();
    }
  }, [selectedDate, loading]);

  // Detectar presente de aniversário vindo da página de doações
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doacaoId = params.get('doacao_id');
    const criancaId = params.get('crianca_id');
    const tipo = params.get('tipo');

    if (tipo === 'presente' && doacaoId && criancaId && !loading) {
      // Encontrar o presente
      const presente = doacoes.find(d => d.id === doacaoId);
      if (presente) {
        setSelectedPresenteId(doacaoId);
        setIsPresenteDialogOpen(true);

        // ✅ Limpar parâmetros de URL após abrir
        // Assim o dialog abre só 1 vez e não toda hora que doacoes muda
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [loading, doacoes]);

  // Atualizar crianças do local selecionado
  useEffect(() => {
    if (selectedLocal) {
      const criancasLocal = criancas.filter(c => c.local_id === selectedLocal);
      setCriancasDoLocal(criancasLocal);

      // Inicializar presenças
      const novasPresencas: { [key: string]: { presente: boolean; observacoes: string; quantidade_consumida: number | string } } = {};
      criancasLocal.forEach(crianca => {
        novasPresencas[crianca.id] = { presente: false, observacoes: "", quantidade_consumida: 1 };
      });
      setPresencas(novasPresencas);
    } else {
      setCriancasDoLocal([]);
      setPresencas({});
    }
  }, [selectedLocal, criancas]);

  const handleLocalChange = (localId: string) => {
    setSelectedLocal(localId);
    form.setValue('local_id', localId);
  };

  const handlePresencaChange = (criancaId: string, presente: boolean) => {
    setPresencas(prev => ({
      ...prev,
      [criancaId]: { ...prev[criancaId], presente }
    }));
  };

  const handleObservacaoChange = (criancaId: string, observacoes: string) => {
    setPresencas(prev => ({
      ...prev,
      [criancaId]: { ...prev[criancaId], observacoes }
    }));
  };

  const handleQuantidadeChange = (criancaId: string, quantidade: number | string) => {
    setPresencas(prev => ({
      ...prev,
      [criancaId]: { ...prev[criancaId], quantidade_consumida: quantidade }
    }));
  };

  const marcarTodosPresentes = () => {
    const novasPresencas = { ...presencas };
    Object.keys(novasPresencas).forEach(id => {
      novasPresencas[id].presente = true;
    });
    setPresencas(novasPresencas);
  };

  const marcarTodosAusentes = () => {
    const novasPresencas = { ...presencas };
    Object.keys(novasPresencas).forEach(id => {
      novasPresencas[id].presente = false;
    });
    setPresencas(novasPresencas);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validar local
      if (!selectedLocal) {
        toast({
          title: "Atenção",
          description: "Selecione um local",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para inserção em lote - TODAS as crianças (presentes E ausentes)
      const doacaoSelecionada = form.getValues('doacao_id') === "none" ? null : form.getValues('doacao_id') || null;

      const checkinsParaInserir = Object.entries(presencas).map(([criancaId, dados]) => ({
        crianca_id: criancaId,
        local_id: selectedLocal,
        presente: dados.presente,
        // Apenas associar doação se a criança estiver PRESENTE
        doacao_id: dados.presente ? doacaoSelecionada : null,
        observacoes: dados.observacoes || form.getValues('observacoes_gerais') || null,
        quantidade_consumida: typeof dados.quantidade_consumida === 'number' ? dados.quantidade_consumida : (parseInt(String(dados.quantidade_consumida)) || 1),
      }));

      if (checkinsParaInserir.length === 0) {
        toast({
          title: "Atenção",
          description: "Nenhuma criança para registrar",
          variant: "destructive",
        });
        return;
      }

      const presentes = checkinsParaInserir.filter(c => c.presente).length;
      const ausentes = checkinsParaInserir.length - presentes;

      // Check-in normal em lote
      await apiClient.createBulkCheckin({ checkins: checkinsParaInserir });

      toast({
        title: "Sucesso",
        description: `Chamada registrada: ${presentes} presente(s), ${ausentes} ausente(s)`,
      });

      setIsDialogOpen(false);
      setSelectedLocal("");
      setPresencas({});
      form.reset();

      // Atualizar dados em paralelo
      await Promise.all([fetchCheckins(), fetchDoacoes()]);
    } catch (error: any) {
      console.error('Erro no check-in:', error);

      // Mensagem específica para estoque insuficiente
      if (error?.response?.data?.error?.message === 'Estoque insuficiente') {
        const details = error.response.data.error.details;
        toast({
          title: "Estoque Insuficiente",
          description: `Não há estoque suficiente. Disponível: ${details.disponivel} ${details.unidade}. Solicitado: ${details.solicitado} ${details.unidade}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error?.response?.data?.error?.message || error?.response?.data?.message || "Erro ao realizar check-in em lote",
          variant: "destructive",
        });
      }
    }
  };

  // Agrupar check-ins por sessão
  const sessoes: SessaoCheckin[] = [];
  const checkinsAgrupados = new Map<string, Checkin[]>();

  checkins.forEach(checkin => {
    const sessaoId = checkin.sessao_id || checkin.id; // Fallback para check-ins antigos
    if (!checkinsAgrupados.has(sessaoId)) {
      checkinsAgrupados.set(sessaoId, []);
    }
    checkinsAgrupados.get(sessaoId)!.push(checkin);
  });

  checkinsAgrupados.forEach((checks, sessaoId) => {
    const presentes = checks.filter(c => c.presente);
    const ausentes = checks.filter(c => !c.presente);
    const primeiro = checks[0];

    sessoes.push({
      sessao_id: sessaoId,
      local_id: primeiro.local_id,
      local: primeiro.local || { nome: 'Local não encontrado' },
      data_checkin: primeiro.data_checkin,
      doacao: primeiro.doacao,
      presentes,
      ausentes,
      total: checks.length
    });
  });

  const filteredSessoes = sessoes.filter(sessao => {
    // Filtro de busca por texto
    const matchesSearch = searchTerm === "" || (
      sessao.local.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sessao.presentes.some(c => c.crianca?.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sessao.ausentes.some(c => c.crianca?.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sessao.doacao?.tipo_doacao.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filtro por local
    const matchesLocal = filterLocal === "all" || sessao.local_id === filterLocal;

    // Filtro por doação (com/sem)
    const matchesDoacao =
      filterDoacao === "all" ? true :
      filterDoacao === "com_doacao" ? sessao.doacao !== null && sessao.doacao !== undefined :
      filterDoacao === "sem_doacao" ? !sessao.doacao :
      true;

    // Filtro por tipo de doação
    const matchesTipoDoacao =
      filterTipoDoacao === "all" ? true :
      sessao.doacao?.tipo_doacao === filterTipoDoacao;

    // Filtro por mês
    const sessaoDate = new Date(sessao.data_checkin);
    const matchesMes =
      filterMes === "all" ? true :
      `${sessaoDate.getFullYear()}-${String(sessaoDate.getMonth() + 1).padStart(2, '0')}` === filterMes;

    // Filtro por ano
    const matchesAno =
      filterAno === "all" ? true :
      sessaoDate.getFullYear().toString() === filterAno;

    return matchesSearch && matchesLocal && matchesDoacao && matchesTipoDoacao && matchesMes && matchesAno;
  });

  // Paginação client-side
  const totalFilteredItems = filteredSessoes.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessoes = filteredSessoes.slice(startIndex, endIndex);

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLocal, filterDoacao, filterTipoDoacao, filterMes, filterAno]);

  const doacoesDoLocal = selectedLocal
    ? doacoes.filter(d =>
        d.local_id === selectedLocal &&
        d.tipo_doacao !== "Presente de Aniversário" // Excluir presentes (só check-in individual)
      )
    : [];

  // Doação selecionada para mostrar a unidade no input de quantidade
  const doacaoSelecionada = form.watch('doacao_id') && form.watch('doacao_id') !== 'none'
    ? doacoes.find(d => d.id === form.watch('doacao_id'))
    : null;

  const totalPresentes = Object.values(presencas).filter(p => p.presente).length;
  const totalCriancas = criancasDoLocal.length;

  // Obter tipos de doação únicos de TODAS as doações cadastradas
  const tiposDoacaoUnicos = Array.from(new Set(
    doacoes.map(d => d.tipo_doacao)
  )).sort();

  // Obter meses únicos dos check-ins
  const mesesUnicos = Array.from(new Set(
    checkins.map(c => {
      const date = new Date(c.data_checkin);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )).sort().reverse();

  // Obter anos únicos dos check-ins (começando de 2025)
  const anosUnicos = Array.from(new Set(
    checkins.map(c => {
      const date = new Date(c.data_checkin);
      return date.getFullYear();
    })
  ))
  .filter(ano => ano >= 2025) // Apenas anos a partir de 2025
  .sort()
  .reverse(); // Mais recente primeiro

  const handleCheckinPresente = async () => {
    if (!selectedPresenteId) {
      toast({
        title: "Atenção",
        description: "Selecione um presente para entregar",
        variant: "destructive",
      });
      return;
    }

    try {
      const presente = presentesPendentes.find(p => p.id === selectedPresenteId);
      if (!presente || !presente.destinatarios || presente.destinatarios.length === 0) {
        toast({
          title: "Erro",
          description: "Presente sem destinatário definido",
          variant: "destructive",
        });
        return;
      }

      const criancaId = presente.destinatarios[0].crianca.id;

      // Criar check-in para entrega de presente de aniversário
      await apiClient.createCheckin({
        crianca_id: criancaId,
        local_id: presente.local_id,
        doacao_id: presente.id,
        observacoes: observacoesPresenteEntrega || "Presente de aniversário entregue",
      });

      toast({
        title: "Sucesso",
        description: `Presente entregue para ${presente.destinatarios[0].crianca.nome}!`,
      });

      setIsPresenteDialogOpen(false);
      setSelectedPresenteId("");
      setObservacoesPresenteEntrega("");

      // Atualizar dados em paralelo
      await Promise.all([fetchCheckins(), fetchDoacoes(), fetchPresentesPendentes()]);
    } catch (error: any) {
      console.error('Erro ao entregar presente:', error);
      toast({
        title: "Erro",
        description: error?.response?.data?.error?.message || "Erro ao entregar presente",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSessao = (sessaoId: string) => {
    if (!confirm('Tem certeza que deseja deletar toda esta sessão de check-in? Esta ação não pode ser desfeita.')) {
      return;
    }

    deleteSessaoMutation.mutate(sessaoId);
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Check-in</h1>
          <p className="text-muted-foreground">
            Marque presença das crianças nos locais (como uma chamada escolar)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                form.reset();
                setSelectedLocal("");
                setPresencas({});
              }} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Check-in em Lote</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Check-in em Lote - Chamada</DialogTitle>
              <DialogDescription className="sr-only">
                Formulário para registrar presença e ausência de crianças em uma chamada
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="local_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local</FormLabel>
                        <Select onValueChange={handleLocalChange} value={selectedLocal}>
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
                    name="doacao_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doação Relacionada (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vincular a uma doação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma doação</SelectItem>
                            {doacoesDoLocal.map((doacao) => (
                              <SelectItem key={doacao.id} value={doacao.id}>
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{doacao.tipo_doacao} - {doacao.doador}</span>
                                  {doacao.descricao && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                      {doacao.descricao}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedLocal && criancasDoLocal.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2 break-words">
                        <Users className="h-5 w-5 flex-shrink-0" />
                        <span>Chamada - {locais.find(l => l.id === selectedLocal)?.nome}</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:gap-2">
                        <Button type="button" size="sm" onClick={marcarTodosPresentes} className="text-xs sm:text-sm">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mr-1" />
                          <span className="hidden sm:inline">Todos Presentes</span>
                          <span className="sm:hidden">Presentes</span>
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={marcarTodosAusentes} className="text-xs sm:text-sm">
                          <XCircle className="h-4 w-4 flex-shrink-0 mr-1" />
                          <span className="hidden sm:inline">Todos Ausentes</span>
                          <span className="sm:hidden">Ausentes</span>
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm text-muted-foreground mb-4">
                        <Badge variant="secondary" className="justify-center">{totalPresentes} presentes</Badge>
                        <Badge variant="outline" className="justify-center">{totalCriancas - totalPresentes} ausentes</Badge>
                        <Badge variant="outline" className="justify-center">Total: {totalCriancas}</Badge>
                      </div>

                      <div className="grid gap-3 max-h-60 overflow-y-auto w-full">
                        {criancasDoLocal.map((crianca) => (
                          <div key={crianca.id} className="flex gap-3 p-3 bg-background rounded border min-w-0">
                            <Checkbox
                              checked={presencas[crianca.id]?.presente || false}
                              onCheckedChange={(checked) =>
                                handlePresencaChange(crianca.id, checked as boolean)
                              }
                              className="mt-1 flex-shrink-0"
                            />
                            <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Baby className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="font-medium break-words">{crianca.nome}</span>
                                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">({crianca.idade}a)</span>
                                {presencas[crianca.id]?.presente && (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">Presente</Badge>
                                )}
                              </div>
                              {doacaoSelecionada && presencas[crianca.id]?.presente && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
                                  <label className="text-muted-foreground flex-shrink-0">Qtd:</label>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={presencas[crianca.id]?.quantidade_consumida ?? ''}
                                    onChange={(e) => {
                                      const valor = e.target.value;
                                      // Se vazio, permite (para poder apagar e digitar novo número)
                                      if (valor === '') {
                                        handleQuantidadeChange(crianca.id, '');
                                        return;
                                      }
                                      // Se digitar número válido, atualiza
                                      const num = parseInt(valor);
                                      if (!isNaN(num) && num > 0) {
                                        handleQuantidadeChange(crianca.id, num);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Ao sair do campo: se vazio ou inválido, volta para 1
                                      const valor = e.target.value;
                                      if (valor === '' || parseInt(valor) < 1 || isNaN(parseInt(valor))) {
                                        handleQuantidadeChange(crianca.id, 1);
                                      }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="w-16 h-8 text-xs"
                                  />
                                  <span className="text-muted-foreground flex-shrink-0">{doacaoSelecionada.unidade || 'un'}</span>
                                </div>
                              )}
                              <Input
                                placeholder="Obs. (opt)"
                                value={presencas[crianca.id]?.observacoes || ""}
                                onChange={(e) => handleObservacaoChange(crianca.id, e.target.value)}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="observacoes_gerais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações que se aplicam a todos os check-ins (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button type="submit" className="w-full sm:flex-1" disabled={totalCriancas === 0}>
                    Confirmar Chamada ({totalPresentes} presentes, {totalCriancas - totalPresentes} ausentes)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
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
                  setSelectedPresenteId("");
                  setObservacoesPresenteEntrega("");
                }}
                className="w-full sm:w-auto"
              >
                <Gift className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Check-in de Presente</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Entregar Presente de Aniversário</DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para registrar entrega de presente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="presente-select">Selecione o Presente</Label>
                  <Select value={selectedPresenteId} onValueChange={setSelectedPresenteId}>
                    <SelectTrigger id="presente-select">
                      <SelectValue placeholder="Escolha um presente pendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentesPendentes.length === 0 ? (
                        <SelectItem value="nenhum" disabled>
                          Nenhum presente pendente
                        </SelectItem>
                      ) : (
                        presentesPendentes.map((presente) => (
                          <SelectItem key={presente.id} value={presente.id}>
                            {presente.descricao} - {presente.doador}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPresenteId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {(() => {
                      const presente = presentesPendentes.find(p => p.id === selectedPresenteId);
                      return presente ? (
                        <div className="space-y-1 text-sm">
                          {presente.destinatarios && presente.destinatarios[0] && (
                            <p><strong>Para:</strong> {presente.destinatarios[0].crianca.nome}</p>
                          )}
                          <p><strong>Doador:</strong> {presente.doador}</p>
                          <p><strong>Local:</strong> {presente.local?.nome}</p>
                          <p><strong>Presente:</strong> {presente.descricao}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observacoes-entrega">Observações (Opcional)</Label>
                  <Textarea
                    id="observacoes-entrega"
                    placeholder="Ex: Criança adorou o presente..."
                    value={observacoesPresenteEntrega}
                    onChange={(e) => setObservacoesPresenteEntrega(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCheckinPresente}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={!selectedPresenteId}
                  >
                    Confirmar Entrega
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
        </div>
      </div>

      {/* Filtros */}
      <Card className="shadow-subtle overflow-hidden">
        <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6">
          {/* Busca sempre visível */}
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por criança, local ou doação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
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
                    {(filterLocal !== "all" || filterDoacao !== "all" || filterTipoDoacao !== "all" || filterMes !== "all" || filterAno !== "all") && (
                      <Badge variant="default" className="ml-2 text-xs">
                        {[filterLocal !== "all", filterDoacao !== "all", filterTipoDoacao !== "all", filterMes !== "all", filterAno !== "all"].filter(Boolean).length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <div className="space-y-3">
                    <Select value={filterLocal} onValueChange={setFilterLocal}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Filtrar por local" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os locais</SelectItem>
                        {locais.map(local => (
                          <SelectItem key={local.id} value={local.id}>
                            {local.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterDoacao} onValueChange={setFilterDoacao}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Com/Sem doação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="com_doacao">Com doação</SelectItem>
                        <SelectItem value="sem_doacao">Sem doação</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterTipoDoacao} onValueChange={setFilterTipoDoacao}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Tipo de doação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {tiposDoacaoUnicos.map(tipo => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterMes} onValueChange={setFilterMes}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Filtrar por mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {mesesUnicos.map(mes => {
                          const [ano, mesNum] = mes.split('-');
                          const mesNome = new Date(parseInt(ano), parseInt(mesNum) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          return (
                            <SelectItem key={mes} value={mes}>
                              {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select value={filterAno} onValueChange={setFilterAno}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Filtrar por ano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {anosUnicos.map(ano => (
                          <SelectItem key={ano} value={ano.toString()}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Layout Desktop */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={filterLocal} onValueChange={setFilterLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {locais.map(local => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDoacao} onValueChange={setFilterDoacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Com/Sem doação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="com_doacao">Com doação</SelectItem>
                  <SelectItem value="sem_doacao">Sem doação</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipoDoacao} onValueChange={setFilterTipoDoacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de doação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {tiposDoacaoUnicos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {mesesUnicos.map(mes => {
                    const [ano, mesNum] = mes.split('-');
                    const mesNome = new Date(parseInt(ano), parseInt(mesNum) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    return (
                      <SelectItem key={mes} value={mes}>
                        {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {anosUnicos.map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros Ativos */}
          {(searchTerm || filterLocal !== "all" || filterDoacao !== "all" || filterTipoDoacao !== "all" || filterMes !== "all" || filterAno !== "all") && (
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

                {filterLocal !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {(locais.find(l => l.id === filterLocal)?.nome || filterLocal).length > 12
                      ? (locais.find(l => l.id === filterLocal)?.nome || filterLocal).substring(0, 12) + '...'
                      : (locais.find(l => l.id === filterLocal)?.nome || filterLocal)}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterLocal("all")}
                    />
                  </Badge>
                )}

                {filterDoacao !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {filterDoacao === "com_doacao" ? "Com doação" : "Sem doação"}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterDoacao("all")}
                    />
                  </Badge>
                )}

                {filterTipoDoacao !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {filterTipoDoacao.length > 12 ? filterTipoDoacao.substring(0, 12) + '...' : filterTipoDoacao}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterTipoDoacao("all")}
                    />
                  </Badge>
                )}

                {filterMes !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {(() => {
                      const [ano, mesNum] = filterMes.split('-');
                      const mesNome = new Date(parseInt(ano), parseInt(mesNum) - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                      return mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
                    })()}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterMes("all")}
                    />
                  </Badge>
                )}

                {filterAno !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {filterAno}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => setFilterAno("all")}
                    />
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterLocal("all");
                  setFilterDoacao("all");
                  setFilterTipoDoacao("all");
                  setFilterMes("all");
                  setFilterAno("all");
                }}
                className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Limpar Todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="w-full overflow-hidden">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
        {paginatedSessoes.map((sessao) => (
          <Card
            key={sessao.sessao_id}
            className={`hover:shadow-md transition-shadow overflow-hidden w-full min-w-0 ${
              sessao.doacao?.tipo_doacao === "Presente de Aniversário"
                ? "border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
                : sessao.doacao
                ? "border-rainbow"
                : "border-2 border-black dark:border-white"
            }`}
          >
            <CardHeader className="pb-3 px-3 sm:px-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <CardTitle className="text-sm sm:text-lg truncate min-w-0">Chamada Registrada</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSessao(sessao.sessao_id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Deletar sessão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="default" className="text-xs whitespace-nowrap">{sessao.presentes.length} presentes</Badge>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">{sessao.ausentes.length} ausentes</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedSessao(sessao);
                      setIsViewDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <span className="hidden sm:inline">Ver Check-in</span>
                    <span className="sm:hidden">Ver Detalhes</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="font-medium truncate">{sessao.local.nome}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="break-words">
                  {new Date(sessao.data_checkin).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {sessao.doacao && (
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                    <Gift className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">{sessao.doacao.tipo_doacao} - {sessao.doacao.doador}</span>
                  </div>
                  {sessao.doacao.descricao && (
                    <p className="text-xs text-muted-foreground pl-6 line-clamp-2 break-words">
                      {sessao.doacao.descricao}
                    </p>
                  )}
                </div>
              )}

              {/* Lista de Presentes - Preview */}
              {sessao.presentes.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Presentes ({sessao.presentes.length})
                  </h4>
                  <div className="max-h-[120px] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                      {sessao.presentes.map(checkin => (
                        <div key={checkin.id} className="flex items-center gap-1 text-sm min-w-0">
                          <Baby className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{checkin.crianca?.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Ausentes - Preview */}
              {sessao.ausentes.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <h4 className="text-sm font-semibold text-red-700 flex items-center gap-1">
                    <XCircle className="h-4 w-4 shrink-0" />
                    Ausentes ({sessao.ausentes.length})
                  </h4>
                  <div className="max-h-[120px] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                      {sessao.ausentes.map(checkin => (
                        <div key={checkin.id} className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                          <Baby className="h-3 w-3 shrink-0" />
                          <span className="truncate">{checkin.crianca?.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      </div>

      {/* Controles de Paginação */}
      {filteredSessoes.length > 0 && (
        <div className="mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            totalItems={totalFilteredItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[16, 32, 64, 100]}
            showItemsPerPage={true}
            showTotalItems={true}
          />
        </div>
      )}

      {filteredSessoes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Nenhuma chamada encontrada</CardTitle>
            <CardDescription>
              {searchTerm
                ? "Nenhuma chamada corresponde aos critérios de busca."
                : `Nenhuma chamada foi registrada em ${new Date(selectedDate).toLocaleDateString('pt-BR')}.`}
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Visualização Detalhada do Check-in */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Detalhes do Check-in
            </DialogTitle>
            <DialogDescription>
              Informações completas da sessão de chamada
            </DialogDescription>
          </DialogHeader>

          {selectedSessao && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Local</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedSessao.local.nome}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {new Date(selectedSessao.data_checkin).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Presentes</p>
                  <Badge variant="default" className="text-base px-3 py-1">
                    {selectedSessao.presentes.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ausentes</p>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {selectedSessao.ausentes.length}
                  </Badge>
                </div>
              </div>

              {/* Informações da Doação */}
              {selectedSessao.doacao && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Doação Vinculada
                  </h3>
                  <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Doação</p>
                        <p className="font-medium">{selectedSessao.doacao.tipo_doacao}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Doador</p>
                        <p className="font-medium">{selectedSessao.doacao.doador}</p>
                      </div>
                    </div>
                    {selectedSessao.doacao.descricao && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="font-medium">{selectedSessao.doacao.descricao}</p>
                      </div>
                    )}
                    {(() => {
                      const doacaoCompleta = doacoes.find(d => d.id === selectedSessao.presentes[0]?.doacao_id);

                      // Calcular total consumido neste check-in específico (apenas presentes)
                      const totalConsumidoNesteCheckin = selectedSessao.presentes
                        .reduce((sum, checkin) => sum + (checkin.quantidade_consumida || 0), 0);

                      return doacaoCompleta && (
                        <>
                          {doacaoCompleta.quantidade && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-sm text-muted-foreground">Quantidade Original</p>
                                  <p className="font-medium">{doacaoCompleta.quantidade} {doacaoCompleta.unidade}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Data da Doação</p>
                                  <p className="font-medium">
                                    {new Date(doacaoCompleta.data_doacao).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>

                              {/* Mostrar estatísticas gerais da doação */}
                              {(doacaoCompleta.total_consumido !== undefined || doacaoCompleta.quantidade_restante !== undefined) && (
                                <div className="pt-2 border-t bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
                                  <p className="text-xs text-muted-foreground mb-2">Estoque Geral (todas as entregas)</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Total Consumido</p>
                                      <p className="font-bold text-blue-600">
                                        {doacaoCompleta.total_consumido || 0} {doacaoCompleta.unidade}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Estoque Atual</p>
                                      <p className="font-bold text-green-600">
                                        {doacaoCompleta.quantidade_restante !== undefined
                                          ? doacaoCompleta.quantidade_restante
                                          : doacaoCompleta.quantidade} {doacaoCompleta.unidade}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Mostrar consumo específico deste check-in */}
                              {totalConsumidoNesteCheckin > 0 && (
                                <div className="pt-2 border-t bg-red-50 dark:bg-red-950/20 p-3 rounded">
                                  <p className="text-xs text-muted-foreground mb-2">Apenas neste Check-in</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Consumido aqui</p>
                                      <p className="font-bold text-red-600">
                                        {totalConsumidoNesteCheckin} {doacaoCompleta.unidade}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Crianças atendidas</p>
                                      <p className="font-bold text-primary">
                                        {selectedSessao.presentes.filter(c => c.quantidade_consumida).length}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Lista de Crianças Presentes */}
              {selectedSessao.presentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Presentes ({selectedSessao.presentes.length})
                  </h3>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    <div className="divide-y">
                      {selectedSessao.presentes.map((checkin) => (
                        <div key={checkin.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Baby className="h-4 w-4 text-primary" />
                              <span className="font-medium">{checkin.crianca?.nome}</span>
                              <span className="text-sm text-muted-foreground">
                                ({checkin.crianca?.idade} anos)
                              </span>
                            </div>
                            {checkin.quantidade_consumida && checkin.quantidade_consumida > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Consumiu: {checkin.quantidade_consumida} {doacoes.find(d => d.id === checkin.doacao_id)?.unidade}
                              </Badge>
                            )}
                          </div>
                          {checkin.observacoes && (
                            <p className="text-sm text-muted-foreground mt-1 ml-6">
                              💬 {checkin.observacoes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Crianças Ausentes */}
              {selectedSessao.ausentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    Ausentes ({selectedSessao.ausentes.length})
                  </h3>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    <div className="divide-y">
                      {selectedSessao.ausentes.map((checkin) => (
                        <div key={checkin.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Baby className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">{checkin.crianca?.nome}</span>
                            <span className="text-sm text-muted-foreground">
                              ({checkin.crianca?.idade} anos)
                            </span>
                          </div>
                          {checkin.observacoes && (
                            <p className="text-sm text-muted-foreground mt-1 ml-6">
                              💬 {checkin.observacoes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}