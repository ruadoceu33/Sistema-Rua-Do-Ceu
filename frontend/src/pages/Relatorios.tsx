import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search,
  Calendar,
  Gift,
  Package,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from 'xlsx';
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Timeline } from "@/components/Timeline";
import { DatePicker, dateToLocalISOString, stringToLocalDate } from "@/components/ui/date-picker";
import { Pagination } from "@/components/Pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [locais, setLocais] = useState<any[]>([]);

  // Estados para cada aba
  const [prestacaoContas, setPrestacaoContas] = useState<any>(null);
  const [aniversariantes, setAniversariantes] = useState<any>(null);
  const [relatorioPresentesAniversario, setRelatorioPresentesAniversario] = useState<any>(null);
  const [frequencia, setFrequencia] = useState<any>(null);
  const [historicoModal, setHistoricoModal] = useState<{open: boolean; criancaId?: string; criancaNome?: string}>({open: false});
  const [historicoCrianca, setHistoricoCrianca] = useState<any>(null);

  // Filtros para Prestação de Contas
  const [filtrosPrestacao, setFiltrosPrestacao] = useState({
    startDate: "",
    endDate: "",
    localId: "",
    tipo: "",
    descricao: ""
  });

  // Filtros para Aniversariantes
  const [filtrosAniversarios, setFiltrosAniversarios] = useState({
    month: -1, //  -1 = "Todos os meses"
    year: new Date().getFullYear(),
    localId: ""
  });

  // Filtros para Histórico Individual
  const [filtrosHistorico, setFiltrosHistorico] = useState({
    tipo: "",
    descricao: "",
    startDate: "",
    endDate: "",
    localId: "", // Adicionar filtro de local
    buscaCrianca: "" // Campo de busca para filtrar crianças
  });

  // Estados de paginação
  const [prestacaoPagination, setPrestacaoPagination] = useState({
    currentPage: 1,
    pageSize: 20
  });

  const [aniversariosPagination, setAniversariosPagination] = useState({
    currentPage: 1,
    pageSize: 20
  });

  // Estado para controlar quantos itens da timeline mostrar
  const [timelineItemsToShow, setTimelineItemsToShow] = useState(10);

  // Filtrar doações SEM presentes de aniversário (vão para outra aba)
  const doacoesSemPresentes = useMemo(() => {
    if (!prestacaoContas?.doacoes) return [];
    return prestacaoContas.doacoes.filter(
      (doacao: any) => doacao.tipo_doacao !== "Presente de Aniversário"
    );
  }, [prestacaoContas]);

  // Recalcular resumo SEM presentes
  const resumoSemPresentes = useMemo(() => {
    if (!prestacaoContas?.resumo) return null;

    // Calcular totais das doações filtradas (sem presentes)
    const totalCriancas = doacoesSemPresentes.reduce((acc: number, doacao: any) =>
      acc + (doacao.total_criancas_atendidas || 0), 0
    );

    const totalItens = doacoesSemPresentes.reduce((acc: number, doacao: any) =>
      acc + (doacao.quantidade_distribuida || 0), 0
    );

    return {
      ...prestacaoContas.resumo,
      total_criancas_atendidas: totalCriancas,
      total_itens_distribuidos: totalItens,
      // Remover dados de presentes do resumo
      presentes: undefined
    };
  }, [prestacaoContas, doacoesSemPresentes]);

  // Dados paginados usando useMemo para performance
  const prestacaoPaginada = useMemo(() => {
    const start = (prestacaoPagination.currentPage - 1) * prestacaoPagination.pageSize;
    const end = start + prestacaoPagination.pageSize;
    return doacoesSemPresentes.slice(start, end);
  }, [doacoesSemPresentes, prestacaoPagination]);

  const aniversariosPaginados = useMemo(() => {
    if (!aniversariantes?.aniversariantes) return [];
    const start = (aniversariosPagination.currentPage - 1) * aniversariosPagination.pageSize;
    const end = start + aniversariosPagination.pageSize;
    return aniversariantes.aniversariantes.slice(start, end);
  }, [aniversariantes, aniversariosPagination]);

  useEffect(() => {
    fetchLocais();
    // Carregar lista de crianças automaticamente para a aba de histórico
    fetchFrequencia();
  }, []);

  // Busca automática com debounce para Prestação de Contas
  useEffect(() => {
    // Só buscar se já tiver algum filtro ativo (evitar busca inicial vazia)
    if (!filtrosPrestacao.startDate && !filtrosPrestacao.endDate &&
        !filtrosPrestacao.localId && !filtrosPrestacao.tipo &&
        !filtrosPrestacao.descricao) {
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchPrestacaoContas();
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timeoutId);
  }, [filtrosPrestacao]);

  // Busca automática com debounce para Histórico Individual
  useEffect(() => {
    // Só buscar se o modal estiver aberto e tiver filtros
    if (!historicoModal.open || !historicoModal.criancaId) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (historicoModal.criancaId) {
        fetchHistoricoCrianca(historicoModal.criancaId);
      }
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timeoutId);
  }, [filtrosHistorico, historicoModal.open, historicoModal.criancaId]);

  const fetchLocais = async () => {
    try {
      const result = await apiClient.getLocais();
      setLocais(result.data || []);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const fetchPrestacaoContas = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getPrestacaoContas(filtrosPrestacao);
      setPrestacaoContas(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar relatório de prestação de contas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAniversariantes = async () => {
    setLoading(true);
    try {
      //  Se month=-1 (Todos os meses), NÃO enviar o parâmetro month
      // O backend interpreta falta do month como "buscar todos os meses"
      const filtros: any = {
        year: filtrosAniversarios.year
      };

      // Só incluir month se não for -1
      if (filtrosAniversarios.month !== -1) {
        filtros.month = filtrosAniversarios.month;
      }

      // Só incluir localId se não estiver vazio
      if (filtrosAniversarios.localId) {
        filtros.localId = filtrosAniversarios.localId;
      }

      const data = await apiClient.getAniversariosMes(filtros);
      setAniversariantes(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar aniversariantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatorioPresentesAniversario = async () => {
    setLoading(true);
    try {
      // Buscar doações do tipo "Presente de Aniversário" com os mesmos filtros de data/local dos aniversariantes
      const data = await apiClient.getPrestacaoContas({
        startDate: "",
        endDate: "",
        localId: filtrosAniversarios.localId,
        tipo: "Presente de Aniversário",
        descricao: ""
      });
      setRelatorioPresentesAniversario(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar relatório de presentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFrequencia = async () => {
    setLoading(true);
    try {
      // Busca lista de crianças sem filtros (usado na aba de histórico)
      const data = await apiClient.getFrequencia({
        startDate: "",
        endDate: "",
        localId: ""
      });
      setFrequencia(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de crianças",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricoCrianca = async (criancaId: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getHistoricoCrianca(criancaId, {
        ...filtrosHistorico,
        page: 1,
        limit: 50
      });
      setHistoricoCrianca(data);
      // Reset timeline pagination quando buscar novo histórico
      setTimelineItemsToShow(10);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico da criança",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = async (tipoRelatorio: string) => {
    try {
      let dados: any[] = [];
      let nomeArquivo = "";

      if (tipoRelatorio === "prestacao-contas" && prestacaoContas) {
        nomeArquivo = "prestacao-contas";
        // Filtrar presentes de aniversário (vão para outra aba)
        const doacoesFiltradas = prestacaoContas.doacoes.filter(
          (doacao: any) => doacao.tipo_doacao !== "Presente de Aniversário"
        );
        dados = doacoesFiltradas.flatMap((doacao: any) =>
          doacao.criancas_atendidas.map((crianca: any) => ({
            "Data da Doação": new Date(doacao.data_doacao).toLocaleDateString('pt-BR'),
            "Doador": doacao.doador,
            "Tipo": doacao.tipo_doacao,
            "Descrição": doacao.descricao,
            "Quantidade Total": doacao.quantidade_total,
            "Unidade": doacao.unidade,
            "Local": doacao.local,
            "Criança": crianca.nome,
            "Quantidade Recebida": crianca.quantidade,
            "Data Entrega": new Date(crianca.data_entrega).toLocaleDateString('pt-BR'),
            "Status": doacao.status
          }))
        );
      } else if (tipoRelatorio === "aniversariantes" && aniversariantes) {
        nomeArquivo = `aniversariantes-${filtrosAniversarios.month + 1}-${filtrosAniversarios.year}`;
        dados = aniversariantes.aniversariantes.map((a: any) => ({
          "Nome": a.nome,
          "Dia do Aniversário": a.dia_aniversario,
          "Idade": `${a.idade_atual} → ${a.idade_completa} anos`,
          "Local": a.local,
          "Status Presente": a.presente_status === "entregue" ? "Entregue" :
                            a.presente_status === "aguardando_entrega" ? "Aguardando" : "Não Registrado",
          "Descrição Presente": a.presente_detalhes?.descricao || "-",
          "Doador Presente": a.presente_detalhes?.doador || "-",
          "Data Entrega": a.presente_detalhes?.data_entrega ?
            new Date(a.presente_detalhes.data_entrega).toLocaleDateString('pt-BR') : "-"
        }));
      }

      if (dados.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum dado para exportar",
          variant: "destructive",
        });
        return;
      }

      // Criar worksheet a partir dos dados
      const worksheet = XLSX.utils.json_to_sheet(dados);

      // Calcular larguras automáticas para cada coluna
      const headers = Object.keys(dados[0]);
      const columnWidths = headers.map(header => {
        // Encontrar o tamanho máximo entre o header e os valores
        const headerLength = header.length;
        const maxDataLength = Math.max(
          ...dados.map(row => {
            const value = String(row[header] || '');
            return value.length;
          })
        );
        // Adicionar padding de 2 caracteres
        return { wch: Math.max(headerLength, maxDataLength) + 2 };
      });

      worksheet['!cols'] = columnWidths;

      // Criar workbook e adicionar worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

      // Gerar arquivo Excel e fazer download
      XLSX.writeFile(workbook, `${nomeArquivo}-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Sucesso",
        description: "Relatório exportado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "distribuido_completamente":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="h-3 w-3 mr-1" /> Distribuído
        </Badge>;
      case "distribuicao_parcial":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          <Clock className="h-3 w-3 mr-1" /> Parcial
        </Badge>;
      case "nao_distribuido":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          <XCircle className="h-3 w-3 mr-1" /> Não Distribuído
        </Badge>;
      default:
        return null;
    }
  };

  const getPresenteStatusBadge = (status: string) => {
    switch (status) {
      case "entregue":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="h-3 w-3 mr-1" /> Entregue
        </Badge>;
      case "aguardando_entrega":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          <Clock className="h-3 w-3 mr-1" /> Aguardando
        </Badge>;
      case "nao_registrado":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
          <AlertCircle className="h-3 w-3 mr-1" /> Não Registrado
        </Badge>;
      default:
        return null;
    }
  };

  const mesesDoAno = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="container mx-auto px-2 sm:px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Relatórios de Controle</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Prestação de contas e controle de doações
          </p>
        </div>
      </div>

      <Tabs defaultValue="prestacao-contas" className="space-y-4">
        <TabsList className="flex w-full md:w-auto h-auto p-1">
          <TabsTrigger
            value="prestacao-contas"
            className="flex-1 md:flex-none flex items-center justify-center px-1 md:px-3 py-2 min-w-0"
          >
            <Package className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline text-sm">Prestação de Contas</span>
          </TabsTrigger>
          <TabsTrigger
            value="aniversariantes"
            className="flex-1 md:flex-none flex items-center justify-center px-1 md:px-3 py-2 min-w-0"
          >
            <Gift className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline text-sm">Aniversários & Presentes</span>
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="flex-1 md:flex-none flex items-center justify-center px-1 md:px-3 py-2 min-w-0"
          >
            <Calendar className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline text-sm">Histórico Individual</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: PRESTAÇÃO DE CONTAS */}
        <TabsContent value="prestacao-contas" className="space-y-4">
          <Card className="overflow-hidden w-full">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="break-words text-lg sm:text-xl">Relatório de Distribuição de Doações</CardTitle>
              <CardDescription className="break-words">
                Controle detalhado de quem recebeu cada doação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6 pb-6">
              {/* Filtros - Mobile com Accordion */}
              <div className="block sm:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="filtros">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Filtros de Busca
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <DatePicker
                        date={filtrosPrestacao.startDate ? stringToLocalDate(filtrosPrestacao.startDate) : undefined}
                        onDateChange={(date) => setFiltrosPrestacao({
                          ...filtrosPrestacao,
                          startDate: date ? dateToLocalISOString(date) : ""
                        })}
                        placeholder="Data inicial"
                        disabled={loading}
                      />
                      <DatePicker
                        date={filtrosPrestacao.endDate ? stringToLocalDate(filtrosPrestacao.endDate) : undefined}
                        onDateChange={(date) => setFiltrosPrestacao({
                          ...filtrosPrestacao,
                          endDate: date ? dateToLocalISOString(date) : ""
                        })}
                        placeholder="Data final"
                        disabled={loading}
                      />
                      <Select
                        value={filtrosPrestacao.localId || "todos"}
                        onValueChange={(value) => setFiltrosPrestacao({...filtrosPrestacao, localId: value === "todos" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os locais" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os locais</SelectItem>
                          {locais.map((local) => (
                            <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={filtrosPrestacao.tipo || "todos"}
                        onValueChange={(value) => setFiltrosPrestacao({...filtrosPrestacao, tipo: value === "todos" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de doação" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os tipos</SelectItem>
                          <SelectItem value="Alimentos">Alimentos</SelectItem>
                          <SelectItem value="Roupas">Roupas</SelectItem>
                          <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                          <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                          <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Descrição (ex: Dia das crianças)"
                        value={filtrosPrestacao.descricao}
                        onChange={(e) => setFiltrosPrestacao({...filtrosPrestacao, descricao: e.target.value})}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Filtros - Desktop expandido */}
              <div className="hidden sm:grid grid-cols-1 md:grid-cols-5 gap-4">
                <DatePicker
                  date={filtrosPrestacao.startDate ? stringToLocalDate(filtrosPrestacao.startDate) : undefined}
                  onDateChange={(date) => setFiltrosPrestacao({
                    ...filtrosPrestacao,
                    startDate: date ? dateToLocalISOString(date) : ""
                  })}
                  placeholder="Data inicial"
                  disabled={loading}
                />
                <DatePicker
                  date={filtrosPrestacao.endDate ? stringToLocalDate(filtrosPrestacao.endDate) : undefined}
                  onDateChange={(date) => setFiltrosPrestacao({
                    ...filtrosPrestacao,
                    endDate: date ? dateToLocalISOString(date) : ""
                  })}
                  placeholder="Data final"
                  disabled={loading}
                />
                <Select
                  value={filtrosPrestacao.localId || "todos"}
                  onValueChange={(value) => setFiltrosPrestacao({...filtrosPrestacao, localId: value === "todos" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os locais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os locais</SelectItem>
                    {locais.map((local) => (
                      <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filtrosPrestacao.tipo || "todos"}
                  onValueChange={(value) => setFiltrosPrestacao({...filtrosPrestacao, tipo: value === "todos" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de doação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="Alimentos">Alimentos</SelectItem>
                    <SelectItem value="Roupas">Roupas</SelectItem>
                    <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                    <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                    <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar palavras na descrição (ex: arroz integral, material dia)"
                  value={filtrosPrestacao.descricao}
                  onChange={(e) => setFiltrosPrestacao({...filtrosPrestacao, descricao: e.target.value})}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <Button onClick={fetchPrestacaoContas} disabled={loading} className="w-full sm:w-auto">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <Button
                    onClick={() => {
                      setFiltrosPrestacao({
                        startDate: "",
                        endDate: "",
                        localId: "",
                        tipo: "",
                        descricao: ""
                      });
                      setPrestacaoContas(null);
                    }}
                    variant="outline"
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                  <span className="hidden sm:flex items-center text-xs text-muted-foreground ml-2">
                    💡 Busca automática ao digitar
                  </span>
                </div>
                {prestacaoContas && (
                  <Button onClick={() => exportarExcel("prestacao-contas")} variant="outline" className="w-full sm:w-auto">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                )}
              </div>

              {/* Indicador de filtros ativos */}
              {(filtrosPrestacao.startDate || filtrosPrestacao.endDate || filtrosPrestacao.tipo || filtrosPrestacao.descricao || filtrosPrestacao.localId) && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 w-full overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 shrink-0">
                      Filtros ativos:
                    </span>
                    {filtrosPrestacao.startDate && (
                      <Badge variant="secondary" className="shrink-0">
                        De: {new Date(filtrosPrestacao.startDate).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {filtrosPrestacao.endDate && (
                      <Badge variant="secondary" className="shrink-0">
                        Até: {new Date(filtrosPrestacao.endDate).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {filtrosPrestacao.tipo && (
                      <Badge variant="secondary" className="shrink-0 truncate max-w-[150px]">Tipo: {filtrosPrestacao.tipo}</Badge>
                    )}
                    {filtrosPrestacao.descricao && (
                      <Badge variant="secondary" className="shrink-0 truncate max-w-[150px]">Descrição: {filtrosPrestacao.descricao}</Badge>
                    )}
                    {filtrosPrestacao.localId && (
                      <Badge variant="secondary" className="shrink-0">Local filtrado</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Resumo */}
              {prestacaoContas && resumoSemPresentes && (
                <div className="w-full overflow-hidden mt-4 space-y-3 sm:space-y-4">
                  {/* Card Resumo Geral */}
                  <Card className="overflow-hidden w-full border-2 border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">📊</span>
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold">{resumoSemPresentes.total_criancas_atendidas}</div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Crianças Atendidas</p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-muted-foreground">•</div>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold">{resumoSemPresentes.total_itens_distribuidos}</div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Itens Distribuídos</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Estoques */}
                  <Card className="overflow-hidden w-full border-blue-200 dark:border-blue-900">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">📦</span>
                        <h3 className="text-sm sm:text-base font-semibold">Doações de Estoque</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-muted-foreground">Tipos de Doação</span>
                          <span className="text-lg sm:text-xl font-bold">{resumoSemPresentes.estoques?.total_doacoes || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-muted-foreground">Distribuídos</span>
                          <span className="text-lg sm:text-xl font-bold text-green-600">{resumoSemPresentes.estoques?.distribuidos || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-muted-foreground">Restantes</span>
                          <span className="text-lg sm:text-xl font-bold text-orange-600">{resumoSemPresentes.estoques?.restantes || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Itens Restantes em Estoque (por tipo) */}
                  {resumoSemPresentes?.restantes_por_tipo && Object.keys(resumoSemPresentes.restantes_por_tipo).length > 0 && (
                    <Card className="overflow-hidden w-full">
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">📦</span>
                          <h3 className="text-sm font-semibold text-muted-foreground">Itens Restantes em Estoque (por tipo)</h3>
                        </div>
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                          {Object.entries(resumoSemPresentes.restantes_por_tipo).map(([tipo, quantidade]: [string, any]) => (
                            <div key={tipo} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                              <span className="text-xs sm:text-sm font-medium truncate mr-2">{tipo}</span>
                              <span className="text-sm sm:text-base font-bold whitespace-nowrap">{quantidade}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Tabela de Doações */}
              {prestacaoContas && doacoesSemPresentes && doacoesSemPresentes.length > 0 && (
                <>
                  {/* Versão Desktop - Tabela */}
                  <div className="hidden md:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[85px] px-2">Data</TableHead>
                          <TableHead className="w-[110px] px-2">Doador</TableHead>
                          <TableHead className="w-[85px] px-2">Tipo</TableHead>
                          <TableHead className="min-w-[100px] px-2">Descrição</TableHead>
                          <TableHead className="w-[70px] px-2 text-center">Total</TableHead>
                          <TableHead className="w-[65px] px-2 text-center">Dist.</TableHead>
                          <TableHead className="w-[65px] px-2 text-center">Rest.</TableHead>
                          <TableHead className="w-[60px] px-2 text-center">Qtd</TableHead>
                          <TableHead className="w-[95px] px-2">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prestacaoPaginada.map((doacao: any) => (
                          <TableRow key={doacao.doacao_id}>
                            <TableCell className="whitespace-nowrap text-xs px-2">{new Date(doacao.data_doacao).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-medium truncate text-xs px-2" title={doacao.doador}>{doacao.doador}</TableCell>
                            <TableCell className="px-2">
                              <Badge variant="outline" className="whitespace-nowrap text-[10px] px-1">{doacao.tipo_doacao}</Badge>
                            </TableCell>
                            <TableCell className="truncate text-xs px-2" title={doacao.descricao}>{doacao.descricao}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs px-2 text-center">{doacao.quantidade_total}</TableCell>
                            <TableCell className="text-green-600 font-semibold whitespace-nowrap text-xs px-2 text-center">
                              {doacao.quantidade_distribuida}
                            </TableCell>
                            <TableCell className="text-orange-600 font-semibold whitespace-nowrap text-xs px-2 text-center">
                              {doacao.quantidade_restante}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs px-2 text-center">{doacao.total_criancas_atendidas}</TableCell>
                            <TableCell className="px-2">{getStatusBadge(doacao.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Versão Mobile - Cards */}
                  <div className="md:hidden space-y-4 mt-4">
                    {prestacaoPaginada.map((doacao: any) => (
                      <Card key={doacao.doacao_id} className="overflow-hidden w-full min-w-0">
                        <CardContent className="pt-4 px-4">
                          <div className="space-y-3 min-w-0">
                            {/* Cabeçalho do Card */}
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doacao.data_doacao).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <h3 className="text-sm font-semibold truncate">{doacao.doador}</h3>
                                <p className="text-xs text-muted-foreground truncate">{doacao.descricao}</p>
                              </div>
                              <div className="shrink-0">
                                {getStatusBadge(doacao.status)}
                              </div>
                            </div>

                            {/* Tipo */}
                            <div>
                              <Badge variant="outline" className="text-xs">{doacao.tipo_doacao}</Badge>
                            </div>

                            {/* Informações de Quantidade */}
                            <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-2">
                              <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Total</span>
                                <span className="font-semibold text-sm block truncate">
                                  {doacao.quantidade_total} {doacao.unidade}
                                </span>
                              </div>
                              <div className="min-w-0 border-x">
                                <span className="text-muted-foreground block text-xs">Distribuído</span>
                                <span className="font-semibold text-sm text-green-600 block">
                                  {doacao.quantidade_distribuida}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-muted-foreground block text-xs">Restante</span>
                                <span className="font-semibold text-sm text-orange-600 block">
                                  {doacao.quantidade_restante}
                                </span>
                              </div>
                            </div>

                            {/* Crianças Atendidas */}
                            <div className="flex items-center justify-center gap-2 text-sm bg-muted/50 rounded p-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{doacao.total_criancas_atendidas}</span>
                              <span className="text-muted-foreground text-xs">crianças atendidas</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Paginação */}
                  <Pagination
                    currentPage={prestacaoPagination.currentPage}
                    totalItems={doacoesSemPresentes.length}
                    pageSize={prestacaoPagination.pageSize}
                    onPageChange={(page) => setPrestacaoPagination({ ...prestacaoPagination, currentPage: page })}
                    onPageSizeChange={(size) => setPrestacaoPagination({ currentPage: 1, pageSize: size })}
                    showSizeChanger={true}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: ANIVERSARIANTES & PRESENTES */}
        <TabsContent value="aniversariantes" className="space-y-4">
          <Card className="overflow-hidden w-full">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="break-words text-lg sm:text-xl">Aniversários & Presentes</CardTitle>
              <CardDescription className="break-words">
                Controle de aniversariantes, doações de presentes e status de entrega
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6 pb-6">
              {/* Filtros - Mobile com Accordion */}
              <div className="block sm:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="filtros">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Filtros de Busca
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <Select
                        value={filtrosAniversarios.month.toString()}
                        onValueChange={(value) => setFiltrosAniversarios({...filtrosAniversarios, month: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[300px]">
                          <SelectItem value="-1">Todos os meses</SelectItem>
                          {mesesDoAno.map((mes, index) => (
                            <SelectItem key={index} value={index.toString()}>{mes}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={filtrosAniversarios.year}
                        onChange={(e) => setFiltrosAniversarios({...filtrosAniversarios, year: parseInt(e.target.value)})}
                        placeholder="Ano"
                      />
                      <Select
                        value={filtrosAniversarios.localId || "todos"}
                        onValueChange={(value) => setFiltrosAniversarios({...filtrosAniversarios, localId: value === "todos" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os locais" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os locais</SelectItem>
                          {locais.map((local) => (
                            <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Filtros - Desktop expandido */}
              <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  value={filtrosAniversarios.month.toString()}
                  onValueChange={(value) => setFiltrosAniversarios({...filtrosAniversarios, month: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]">
                    <SelectItem value="-1">Todos os meses</SelectItem>
                    {mesesDoAno.map((mes, index) => (
                      <SelectItem key={index} value={index.toString()}>{mes}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={filtrosAniversarios.year}
                  onChange={(e) => setFiltrosAniversarios({...filtrosAniversarios, year: parseInt(e.target.value)})}
                  placeholder="Ano"
                />
                <Select
                  value={filtrosAniversarios.localId || "todos"}
                  onValueChange={(value) => setFiltrosAniversarios({...filtrosAniversarios, localId: value === "todos" ? "" : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os locais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os locais</SelectItem>
                    {locais.map((local) => (
                      <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 mb-4">
                <Button onClick={() => {
                  fetchAniversariantes();
                  fetchRelatorioPresentesAniversario();
                }} disabled={loading} className="w-full sm:w-auto">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button
                  onClick={() => {
                    setFiltrosAniversarios({
                      month: -1, // Reseta para "Todos os meses"
                      year: new Date().getFullYear(),
                      localId: ""
                    });
                    setAniversariantes(null);
                    setRelatorioPresentesAniversario(null);
                  }}
                  variant="outline"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                {aniversariantes && (
                  <Button onClick={() => exportarExcel("aniversariantes")} variant="outline" className="w-full sm:w-auto">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                )}
              </div>

              {/* Indicador de período selecionado */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 w-full overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100 break-words">
                    Buscando aniversariantes de: <strong>
                      {filtrosAniversarios.month === -1
                        ? `Todos os meses de ${filtrosAniversarios.year}`
                        : `${mesesDoAno[filtrosAniversarios.month]} de ${filtrosAniversarios.year}`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Resumo */}
              {aniversariantes && (
                <div className="w-full overflow-hidden mt-4">
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                    <Card className="overflow-hidden w-full min-w-0">
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                        <div className="text-xl sm:text-2xl font-bold truncate">{aniversariantes.resumo.total_aniversariantes}</div>
                        <p className="text-xs text-muted-foreground break-words">Total Aniversariantes</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden w-full min-w-0">
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 truncate">
                          {aniversariantes.resumo.presentes_entregues}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">Presentes Entregues</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden w-full min-w-0">
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600 truncate">
                          {aniversariantes.resumo.presentes_aguardando}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">Aguardando Entrega</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden w-full min-w-0">
                      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                        <div className="text-xl sm:text-2xl font-bold text-red-600 truncate">
                          {aniversariantes.resumo.presentes_nao_registrados}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">Não Registrados</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Card de Relatório de Presentes (Doações) */}
              {relatorioPresentesAniversario && (
                <div className="w-full overflow-hidden mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="h-5 w-5 text-pink-600" />
                    <h3 className="text-lg font-semibold">Relatório de Presentes - Doações & Estoque</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* Card Presentes Doados */}
                    <Card className="overflow-hidden w-full border-pink-200 dark:border-pink-900">
                      <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">🎁</span>
                          <h4 className="text-sm sm:text-base font-semibold">Presentes Recebidos</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Total Registrados</span>
                            <span className="text-lg sm:text-xl font-bold">{relatorioPresentesAniversario.resumo.presentes?.total_registrados || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Entregues</span>
                            <span className="text-lg sm:text-xl font-bold text-green-600">{relatorioPresentesAniversario.resumo.presentes?.entregues || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Pendentes</span>
                            <span className="text-lg sm:text-xl font-bold text-orange-600">{relatorioPresentesAniversario.resumo.presentes?.pendentes || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card Crianças Atendidas */}
                    <Card className="overflow-hidden w-full border-blue-200 dark:border-blue-900">
                      <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">👧</span>
                          <h4 className="text-sm sm:text-base font-semibold">Crianças</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Total Atendidas</span>
                            <span className="text-lg sm:text-xl font-bold">{relatorioPresentesAniversario.resumo.total_criancas_atendidas || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Itens Distribuídos</span>
                            <span className="text-lg sm:text-xl font-bold text-green-600">{relatorioPresentesAniversario.resumo.total_itens_distribuidos || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card Doações (Total de Presentes) */}
                    <Card className="overflow-hidden w-full border-purple-200 dark:border-purple-900">
                      <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">📊</span>
                          <h4 className="text-sm sm:text-base font-semibold">Estatísticas</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Doações Registradas</span>
                            <span className="text-lg sm:text-xl font-bold">{relatorioPresentesAniversario.doacoes?.length || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                            <span className="text-xs sm:text-sm font-medium text-blue-600">
                              {relatorioPresentesAniversario.doacoes?.length > 0 ? "Ativo" : "Sem dados"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Tabela de Aniversariantes - Desktop */}
              {aniversariantes && aniversariantes.aniversariantes && aniversariantes.aniversariantes.length > 0 && (
                <>
                  {/* Versão Desktop - Tabela */}
                  <div className="hidden md:block w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[60px]">Dia</TableHead>
                          <TableHead className="min-w-[120px]">Nome</TableHead>
                          <TableHead className="min-w-[80px]">Idade</TableHead>
                          <TableHead className="min-w-[100px]">Local</TableHead>
                          <TableHead className="min-w-[130px]">Status Presente</TableHead>
                          <TableHead className="min-w-[150px]">Descrição</TableHead>
                          <TableHead className="min-w-[120px]">Doador</TableHead>
                          <TableHead className="min-w-[100px]">Data Entrega</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aniversariosPaginados.map((aniv: any) => (
                          <TableRow key={aniv.crianca_id}>
                            <TableCell className="font-bold whitespace-nowrap">{aniv.dia_aniversario}</TableCell>
                            <TableCell className="font-medium truncate max-w-[150px]">{aniv.nome}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {aniv.idade_atual} → {aniv.idade_completa} {aniv.idade_completa === 1 ? 'ano' : 'anos'}
                            </TableCell>
                            <TableCell className="truncate max-w-[120px]">{aniv.local}</TableCell>
                            <TableCell>{getPresenteStatusBadge(aniv.presente_status)}</TableCell>
                            <TableCell className="truncate max-w-[200px]">{aniv.presente_detalhes?.descricao || "-"}</TableCell>
                            <TableCell className="truncate max-w-[150px]">{aniv.presente_detalhes?.doador || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {aniv.presente_detalhes?.data_entrega ?
                                new Date(aniv.presente_detalhes.data_entrega).toLocaleDateString('pt-BR') : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Versão Mobile - Cards */}
                  <div className="md:hidden space-y-4 mt-4">
                    {aniversariosPaginados.map((aniv: any) => (
                      <Card key={aniv.crianca_id} className="overflow-hidden w-full min-w-0">
                        <CardContent className="pt-6 px-4">
                          <div className="space-y-3 min-w-0">
                            {/* Cabeçalho do Card */}
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Gift className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="text-2xl font-bold text-primary">{aniv.dia_aniversario}</span>
                                </div>
                                <h3 className="text-lg font-semibold mt-1 truncate">{aniv.nome}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {aniv.idade_atual} → {aniv.idade_completa} {aniv.idade_completa === 1 ? 'ano' : 'anos'}
                                </p>
                              </div>
                              <div className="shrink-0">
                                {getPresenteStatusBadge(aniv.presente_status)}
                              </div>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 text-sm min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-muted-foreground shrink-0">Local:</span>
                                <span className="font-medium truncate">{aniv.local}</span>
                              </div>

                              {aniv.presente_detalhes?.descricao && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-muted-foreground shrink-0">Presente:</span>
                                  <span className="font-medium break-words">{aniv.presente_detalhes.descricao}</span>
                                </div>
                              )}

                              {aniv.presente_detalhes?.doador && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground shrink-0">Doador:</span>
                                  <span className="font-medium truncate">{aniv.presente_detalhes.doador}</span>
                                </div>
                              )}

                              {aniv.presente_detalhes?.data_entrega && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground shrink-0">Entregue em:</span>
                                  <span className="font-medium whitespace-nowrap">
                                    {new Date(aniv.presente_detalhes.data_entrega).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Paginação */}
                  <Pagination
                    currentPage={aniversariosPagination.currentPage}
                    totalItems={aniversariantes.aniversariantes.length}
                    pageSize={aniversariosPagination.pageSize}
                    onPageChange={(page) => setAniversariosPagination({ ...aniversariosPagination, currentPage: page })}
                    onPageSizeChange={(size) => setAniversariosPagination({ currentPage: 1, pageSize: size })}
                    showSizeChanger={true}
                    pageSizeOptions={[10, 20, 50, 100]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: HISTÓRICO INDIVIDUAL */}
        <TabsContent value="historico" className="space-y-4">
          <Card className="overflow-hidden w-full">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="break-words text-lg sm:text-xl">Histórico Individual de Criança</CardTitle>
              <CardDescription className="break-words">
                Visualize o histórico completo de doações recebidas por cada criança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6 pb-6">
              {/* Seleção de local e criança em 2 etapas */}
              <div className="space-y-4">
                {/* Linha 1: Filtro de Local e Criança */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">1. Selecione o Local</label>
                    <Select
                      value={filtrosHistorico.localId || "todos"}
                      onValueChange={(value) => {
                        setFiltrosHistorico({
                          ...filtrosHistorico,
                          localId: value === "todos" ? "" : value
                        });
                        // Limpar criança selecionada quando mudar o local
                        setHistoricoModal({open: false, criancaId: undefined, criancaNome: ""});
                        setHistoricoCrianca(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os locais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">
                          Todos os locais ({frequencia?.criancas?.length || 0})
                        </SelectItem>
                        {locais.map((local) => {
                          const count = frequencia?.criancas?.filter((c: any) => c.local === local.nome).length || 0;
                          return (
                            <SelectItem key={local.id} value={local.id}>
                              {local.nome} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      2. Selecione a Criança
                      {(() => {
                        const criancasFiltradas = filtrosHistorico.localId
                          ? frequencia?.criancas.filter((c: any) => {
                              const localCrianca = locais.find(l => l.nome === c.local);
                              return localCrianca?.id === filtrosHistorico.localId;
                            })
                          : frequencia?.criancas;
                        const total = criancasFiltradas?.length || 0;
                        return total > 0 ? (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({total} {total === 1 ? 'criança' : 'crianças'})
                          </span>
                        ) : null;
                      })()}
                    </label>

                    {/* Campo de busca rápida - aparece se houver muitas crianças */}
                    {(() => {
                      const criancasFiltradas = filtrosHistorico.localId
                        ? frequencia?.criancas.filter((c: any) => {
                            const localCrianca = locais.find(l => l.nome === c.local);
                            return localCrianca?.id === filtrosHistorico.localId;
                          })
                        : frequencia?.criancas;

                      return (criancasFiltradas?.length || 0) > 10 ? (
                        <Input
                          placeholder="🔍 Buscar criança por nome..."
                          value={filtrosHistorico.buscaCrianca}
                          onChange={(e) => setFiltrosHistorico({
                            ...filtrosHistorico,
                            buscaCrianca: e.target.value
                          })}
                          className="mb-2"
                        />
                      ) : null;
                    })()}

                    <Select
                      value={historicoModal.criancaId || "selecione"}
                      onValueChange={(value) => {
                        if (value !== "selecione") {
                          const criancasFiltradas = filtrosHistorico.localId
                            ? frequencia?.criancas.filter((c: any) => {
                                const localCrianca = locais.find(l => l.nome === c.local);
                                return localCrianca?.id === filtrosHistorico.localId;
                              })
                            : frequencia?.criancas;

                          const crianca = criancasFiltradas?.find((c: any) => c.crianca_id === value);
                          setHistoricoModal({open: false, criancaId: value, criancaNome: crianca?.nome || ""});
                          fetchHistoricoCrianca(value);
                        }
                      }}
                      disabled={!frequencia?.criancas || frequencia.criancas.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !frequencia?.criancas ? "Carregando..." : "Selecione uma criança"
                        } />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="selecione">Selecione uma criança</SelectItem>
                        {(() => {
                          let criancasFiltradas = filtrosHistorico.localId
                            ? frequencia?.criancas.filter((c: any) => {
                                const localCrianca = locais.find(l => l.nome === c.local);
                                return localCrianca?.id === filtrosHistorico.localId;
                              })
                            : frequencia?.criancas;

                          // Aplicar busca por nome se houver texto
                          if (filtrosHistorico.buscaCrianca) {
                            criancasFiltradas = criancasFiltradas?.filter((c: any) =>
                              c.nome.toLowerCase().includes(filtrosHistorico.buscaCrianca.toLowerCase())
                            );
                          }

                          // Ordenar alfabeticamente
                          const criancasOrdenadas = criancasFiltradas?.sort((a: any, b: any) =>
                            a.nome.localeCompare(b.nome)
                          );

                          if (!criancasOrdenadas || criancasOrdenadas.length === 0) {
                            return (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                {filtrosHistorico.buscaCrianca
                                  ? "Nenhuma criança encontrada"
                                  : "Nenhuma criança cadastrada"}
                              </div>
                            );
                          }

                          return criancasOrdenadas.map((crianca: any) => (
                            <SelectItem key={crianca.crianca_id} value={crianca.crianca_id}>
                              {crianca.nome}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Linha 2: Outros filtros - Mobile com Accordion */}
                <div className="block sm:hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="filtros-adicionais">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Filtros Adicionais
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <Select
                          value={filtrosHistorico.tipo || "todos"}
                          onValueChange={(value) => {
                            setFiltrosHistorico({...filtrosHistorico, tipo: value === "todos" ? "" : value});
                            if (historicoModal.criancaId) {
                              fetchHistoricoCrianca(historicoModal.criancaId);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de doação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os tipos</SelectItem>
                            <SelectItem value="Alimentos">Alimentos</SelectItem>
                            <SelectItem value="Roupas">Roupas</SelectItem>
                            <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                            <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                            <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                            <SelectItem value="Presente de Aniversário">Presente de Aniversário</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Buscar palavras (ex: material dia)"
                          value={filtrosHistorico.descricao}
                          onChange={(e) => setFiltrosHistorico({...filtrosHistorico, descricao: e.target.value})}
                        />

                        <DatePicker
                          date={filtrosHistorico.startDate ? stringToLocalDate(filtrosHistorico.startDate) : undefined}
                          onDateChange={(date) => setFiltrosHistorico({
                            ...filtrosHistorico,
                            startDate: date ? dateToLocalISOString(date) : ""
                          })}
                          placeholder="Data inicial"
                          disabled={loading}
                        />

                        <DatePicker
                          date={filtrosHistorico.endDate ? stringToLocalDate(filtrosHistorico.endDate) : undefined}
                          onDateChange={(date) => setFiltrosHistorico({
                            ...filtrosHistorico,
                            endDate: date ? dateToLocalISOString(date) : ""
                          })}
                          placeholder="Data final"
                          disabled={loading}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Linha 2: Outros filtros - Desktop expandido */}
                <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select
                    value={filtrosHistorico.tipo || "todos"}
                    onValueChange={(value) => {
                      setFiltrosHistorico({...filtrosHistorico, tipo: value === "todos" ? "" : value});
                      if (historicoModal.criancaId) {
                        fetchHistoricoCrianca(historicoModal.criancaId);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de doação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="Alimentos">Alimentos</SelectItem>
                      <SelectItem value="Roupas">Roupas</SelectItem>
                      <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                      <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                      <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                      <SelectItem value="Presente de Aniversário">Presente de Aniversário</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Buscar palavras (ex: material dia)"
                    value={filtrosHistorico.descricao}
                    onChange={(e) => setFiltrosHistorico({...filtrosHistorico, descricao: e.target.value})}
                  />

                  <DatePicker
                    date={filtrosHistorico.startDate ? stringToLocalDate(filtrosHistorico.startDate) : undefined}
                    onDateChange={(date) => setFiltrosHistorico({
                      ...filtrosHistorico,
                      startDate: date ? dateToLocalISOString(date) : ""
                    })}
                    placeholder="Data inicial"
                    disabled={loading}
                  />

                  <DatePicker
                    date={filtrosHistorico.endDate ? stringToLocalDate(filtrosHistorico.endDate) : undefined}
                    onDateChange={(date) => setFiltrosHistorico({
                      ...filtrosHistorico,
                      endDate: date ? dateToLocalISOString(date) : ""
                    })}
                    placeholder="Data final"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 mb-4">
                {historicoModal.criancaId && (
                  <>
                    <Button
                      onClick={() => fetchHistoricoCrianca(historicoModal.criancaId!)}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Filtrar
                    </Button>
                    <Button
                      onClick={() => {
                        setFiltrosHistorico({
                          tipo: "",
                          descricao: "",
                          startDate: "",
                          endDate: "",
                          localId: "",
                          buscaCrianca: ""
                        });
                        setHistoricoModal({open: false, criancaId: undefined, criancaNome: ""});
                        setHistoricoCrianca(null);
                      }}
                      variant="outline"
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Limpar Tudo
                    </Button>
                  </>
                )}

                {historicoCrianca && historicoCrianca.historico && historicoCrianca.historico.length > 0 && (
                  <Button
                    onClick={() => {
                      const dados = historicoCrianca.historico.map((h: any) => ({
                        "Data": new Date(h.data_entrega).toLocaleDateString('pt-BR'),
                        "Criança": historicoModal.criancaNome,
                        "Tipo": h.doacao.tipo_doacao,
                        "Descrição": h.doacao.descricao,
                        "Doador": h.doacao.doador,
                        "Quantidade": h.quantidade_consumida,
                        "Unidade": h.doacao.unidade || "",
                        "Observações": h.observacoes || ""
                      }));

                      // Criar worksheet a partir dos dados
                      const worksheet = XLSX.utils.json_to_sheet(dados);

                      // Calcular larguras automáticas para cada coluna
                      const headers = Object.keys(dados[0]);
                      const columnWidths = headers.map(header => {
                        const headerLength = header.length;
                        const maxDataLength = Math.max(
                          ...dados.map(row => {
                            const value = String(row[header] || '');
                            return value.length;
                          })
                        );
                        return { wch: Math.max(headerLength, maxDataLength) + 2 };
                      });

                      worksheet['!cols'] = columnWidths;

                      // Criar workbook e adicionar worksheet
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');

                      // Gerar arquivo Excel e fazer download
                      XLSX.writeFile(workbook, `historico-${historicoModal.criancaNome}-${new Date().toISOString().split('T')[0]}.xlsx`);

                      toast({
                        title: "Sucesso",
                        description: "Histórico exportado com sucesso",
                      });
                    }}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                )}
              </div>

              {/* Indicador de filtros ativos */}
              {historicoModal.criancaId && (filtrosHistorico.tipo || filtrosHistorico.descricao || filtrosHistorico.startDate || filtrosHistorico.endDate) && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 w-full overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 shrink-0">
                      Filtros ativos:
                    </span>
                    {filtrosHistorico.startDate && (
                      <Badge variant="secondary" className="shrink-0">
                        De: {new Date(filtrosHistorico.startDate).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {filtrosHistorico.endDate && (
                      <Badge variant="secondary" className="shrink-0">
                        Até: {new Date(filtrosHistorico.endDate).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                    {filtrosHistorico.tipo && (
                      <Badge variant="secondary" className="shrink-0 truncate max-w-[150px]">Tipo: {filtrosHistorico.tipo}</Badge>
                    )}
                    {filtrosHistorico.descricao && (
                      <Badge variant="secondary" className="shrink-0 truncate max-w-[150px]">Descrição: {filtrosHistorico.descricao}</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem quando nenhuma criança foi selecionada */}
              {!historicoModal.criancaId && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione uma criança no campo acima para visualizar seu histórico completo de doações recebidas
                  </p>
                </div>
              )}

              {/* Resumo quando criança foi selecionada */}
              {historicoCrianca && historicoModal.criancaId && (
                <>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg w-full overflow-hidden mt-4">
                    <h3 className="font-semibold text-base sm:text-lg mb-2 truncate">
                      {historicoModal.criancaNome}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground break-words">Total de Itens Recebidos</p>
                        <p className="text-xl sm:text-2xl font-bold truncate">{historicoCrianca.resumo.total_itens}</p>
                      </div>
                      <div className="md:col-span-2 min-w-0">
                        <p className="text-sm text-muted-foreground mb-2">Por Tipo de Doação</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(historicoCrianca.resumo.por_tipo || {}).map(([tipo, count]: any) => (
                            <Badge key={tipo} variant="secondary" className="shrink-0">
                              {tipo}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Timeline de Doações Recebidas</h4>
                    <Timeline
                      items={historicoCrianca.historico.slice(0, timelineItemsToShow)}
                      emptyMessage="Nenhuma doação recebida no período selecionado"
                    />

                    {/* Botão "Carregar Mais" */}
                    {historicoCrianca.historico.length > timelineItemsToShow && (
                      <div className="flex justify-center mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setTimelineItemsToShow(prev => prev + 10)}
                        >
                          Carregar Mais ({historicoCrianca.historico.length - timelineItemsToShow} restantes)
                        </Button>
                      </div>
                    )}

                    {/* Botão "Mostrar Menos" quando tiver mais de 10 itens visíveis */}
                    {timelineItemsToShow > 10 && historicoCrianca.historico.length >= timelineItemsToShow && (
                      <div className="flex justify-center mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTimelineItemsToShow(10)}
                        >
                          Mostrar Menos
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Histórico Individual */}
      <Dialog open={historicoModal.open} onOpenChange={(open) => setHistoricoModal({...historicoModal, open})}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg px-2 sm:px-6">
          <DialogHeader>
            <DialogTitle>Histórico de Doações - {historicoModal.criancaNome}</DialogTitle>
            <DialogDescription>
              Timeline completa de todas as doações recebidas
            </DialogDescription>
          </DialogHeader>

          {/* Filtros do histórico */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filtrosHistorico.tipo || "todos"}
              onValueChange={(value) => {
                setFiltrosHistorico({...filtrosHistorico, tipo: value === "todos" ? "" : value});
                if (historicoModal.criancaId) {
                  fetchHistoricoCrianca(historicoModal.criancaId);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de doação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Alimentos">Alimentos</SelectItem>
                <SelectItem value="Roupas">Roupas</SelectItem>
                <SelectItem value="Material Escolar">Material Escolar</SelectItem>
                <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
                <SelectItem value="Presente de Aniversário">Presente de Aniversário</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar palavras"
              value={filtrosHistorico.descricao}
              onChange={(e) => setFiltrosHistorico({...filtrosHistorico, descricao: e.target.value})}
            />
            <DatePicker
              date={filtrosHistorico.startDate ? stringToLocalDate(filtrosHistorico.startDate) : undefined}
              onDateChange={(date) => setFiltrosHistorico({
                ...filtrosHistorico,
                startDate: date ? dateToLocalISOString(date) : ""
              })}
              placeholder="Data inicial"
              disabled={loading}
            />
            <DatePicker
              date={filtrosHistorico.endDate ? stringToLocalDate(filtrosHistorico.endDate) : undefined}
              onDateChange={(date) => setFiltrosHistorico({
                ...filtrosHistorico,
                endDate: date ? dateToLocalISOString(date) : ""
              })}
              placeholder="Data final"
              disabled={loading}
            />
          </div>

          <Button
            onClick={() => historicoModal.criancaId && fetchHistoricoCrianca(historicoModal.criancaId)}
            disabled={loading}
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            Filtrar
          </Button>

          {/* Resumo */}
          {historicoCrianca && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{historicoCrianca.resumo.total_itens}</div>
                  <p className="text-xs text-muted-foreground">Total de Itens</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm font-semibold">Por Tipo:</div>
                  {Object.entries(historicoCrianca.resumo.por_tipo || {}).map(([tipo, count]: any) => (
                    <div key={tipo} className="text-xs text-muted-foreground">
                      {tipo}: {count}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline */}
          {historicoCrianca && (
            <>
              <Timeline
                items={historicoCrianca.historico.slice(0, timelineItemsToShow)}
                emptyMessage="Nenhuma doação recebida no período selecionado"
              />

              {/* Botão "Carregar Mais" */}
              {historicoCrianca.historico.length > timelineItemsToShow && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setTimelineItemsToShow(prev => prev + 10)}
                  >
                    Carregar Mais ({historicoCrianca.historico.length - timelineItemsToShow} restantes)
                  </Button>
                </div>
              )}

              {/* Botão "Mostrar Menos" */}
              {timelineItemsToShow > 10 && historicoCrianca.historico.length >= timelineItemsToShow && (
                <div className="flex justify-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimelineItemsToShow(10)}
                  >
                    Mostrar Menos
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
