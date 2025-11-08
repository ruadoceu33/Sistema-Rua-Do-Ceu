// Importa hooks essenciais do React: useState para gerenciar estado e useEffect para lidar com efeitos colaterais (como chamadas de API).
import { useState, useEffect } from "react";
// Importa componentes de UI reutilizáveis, seguindo a filosofia de componentização do React.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Importa ícones da biblioteca lucide-react para uma interface mais visual e intuitiva.
import { Calendar, Gift, Heart, Filter, Download, Search, Loader2, X, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// Componentes customizados para feedback ao usuário (spinner de carregamento e estado vazio).
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
// Hooks customizados que abstraem a lógica de busca de dados de aniversários e estatísticas. Isso mantém o componente mais limpo.
import { useBirthdays, useBirthdayStats } from "@/hooks/useBirthdays";
// Cliente de API centralizado para fazer requisições ao backend.
import { apiClient } from "@/lib/api";
// Componentes de diálogo (modais) para interações específicas, como registrar um presente ou ver o perfil.
import { GiftDialog } from "@/components/birthday/GiftDialog";
import { ChildProfileDialog } from "@/components/birthday/ChildProfileDialog";
// Bibliotecas para exportação de dados nos formatos Excel e PDF.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- DEFINIÇÃO DE TIPOS (TYPESCRIPT) ---
// A utilização de interfaces com TypeScript garante a segurança de tipos,
// prevenindo erros e melhorando a autocompletude do código.

// Interface para os dados de um aniversariante.
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

// Interface para os dados de um local.
interface Local {
  id: string;
  nome: string;
}

/**
 * Componente Aniversarios
 * 
 * Esta página é responsável por exibir, filtrar e gerenciar os aniversários das crianças.
 * Ela permite a busca, filtragem por local e data, e exportação dos dados.
 */
export default function Aniversarios() {
  // --- GERENCIAMENTO DE ESTADO (useState) ---
  // O hook `useState` permite adicionar estado a componentes de função.
  // Cada `useState` declara uma variável de estado e uma função para atualizá-la.

  // Estado para o termo de busca digitado pelo usuário.
  const [searchTerm, setSearchTerm] = useState("");
  // Estado para o local selecionado no filtro. "all" representa todos os locais.
  const [selectedLocal, setSelectedLocal] = useState<string>("all");

  // Estado para controlar qual tipo de filtro de data está ativo: 'rapido' ou 'personalizado'.
  const [tipoFiltro, setTipoFiltro] = useState<'rapido' | 'personalizado'>('rapido');

  // Estado para o filtro rápido de período (ex: "Este mês", "Próximo mês").
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Estados para o filtro de data personalizada (mês e ano específicos).
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Estado para armazenar a lista de locais buscada da API.
  const [locais, setLocais] = useState<Local[]>([]);
  // Estado para armazenar os dados da criança selecionada para abrir um diálogo (perfil ou presente).
  const [selectedChild, setSelectedChild] = useState<Birthday | null>(null);
  // Estados para controlar a visibilidade dos diálogos de presente e perfil.
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // --- LÓGICA DE FILTROS ---
  // Objeto que compila todos os filtros ativos em um único lugar.
  // Este objeto será passado para o hook `useBirthdays` para refinar a busca de dados.
  const filters = {
    searchTerm: searchTerm || undefined, // Envia `undefined` se a busca estiver vazia.
    localId: selectedLocal !== "all" ? selectedLocal : undefined,

    // Adiciona filtros de período apenas se o tipo de filtro for 'rapido'.
    ...(tipoFiltro === 'rapido' && {
      period: selectedPeriod !== "all" ? selectedPeriod as any : undefined,
    }),

    // Adiciona filtros de data específica apenas se o tipo for 'personalizado'.
    ...(tipoFiltro === 'personalizado' && {
      selectedMonth,
      selectedYear,
    }),
  };

  // --- BUSCA DE DADOS (CUSTOM HOOKS) ---
  // `useBirthdays` é um hook customizado que busca os aniversariantes da API.
  // Ele recebe os filtros e retorna os dados, o estado de carregamento e outros metadados.
  // A reatividade é gerenciada dentro do hook: sempre que `filters` mudar, a busca será refeita.
  const { data: birthdays, isLoading: birthdaysLoading } = useBirthdays(filters);
  
  // `useBirthdayStats` busca as estatísticas (total no mês, semana, etc.).
  const { data: stats, isLoading: statsLoading } = useBirthdayStats();

  // --- EFEITOS COLATERAIS (useEffect) ---
  // O hook `useEffect` é usado para executar código que interage com o "mundo exterior",
  // como chamadas de API, manipulação do DOM, etc.
  useEffect(() => {
    // Função assíncrona para buscar a lista de locais disponíveis para o filtro.
    const fetchLocais = async () => {
      try {
        const result = await apiClient.getLocais();
        // A API pode retornar os dados em diferentes formatos, então garantimos que estamos pegando o array.
        const data = result.data || result || [];
        setLocais(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar locais:', error);
        setLocais([]); // Em caso de erro, define a lista de locais como vazia.
      }
    };

    fetchLocais();
  }, []); // O array de dependências vazio `[]` significa que este efeito executa apenas uma vez, quando o componente é montado.

  // Função para limpar todos os filtros e redefinir os estados para seus valores iniciais.
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLocal("all");
    setTipoFiltro("rapido");
    setSelectedPeriod("all");
    setSelectedMonth(undefined);
    setSelectedYear(new Date().getFullYear());
  };

  // --- DADOS AUXILIARES PARA RENDERIZAÇÃO ---
  // Arrays para preencher os seletores de mês e ano nos filtros.
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2);

  // Variável booleana que indica se algum filtro está ativo. Usada para renderização condicional.
  const hasActiveFilters = searchTerm || selectedLocal !== "all" ||
    (tipoFiltro === 'rapido' && selectedPeriod !== "all") ||
    (tipoFiltro === 'personalizado' && selectedMonth !== undefined);

  // --- FUNÇÕES DE EXPORTAÇÃO ---

  // Função para exportar os dados da tabela para um arquivo Excel (.xlsx).
  const exportarParaExcel = () => {
    if (!birthdays || birthdays.length === 0) {
      alert('Nenhum aniversariante para exportar');
      return;
    }

    // Mapeia os dados dos aniversariantes para um formato adequado para a planilha.
    const dados = birthdays.map(b => ({
      'Nome': b.name,
      'Idade Atual': b.currentAge,
      'Fará': `${b.turningAge} anos`,
      'Data de Nascimento': b.birthDate,
      'Local': b.location,
      'Dias até Aniversário': b.daysUntil === 0 ? 'Hoje!' : b.daysUntil === 1 ? 'Amanhã' : `${b.daysUntil} dias`
    }));

    const ws = XLSX.utils.json_to_sheet(dados); // Cria a planilha a partir do JSON.

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

    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new(); // Cria um novo workbook (arquivo Excel).
    XLSX.utils.book_append_sheet(wb, ws, 'Aniversariantes'); // Adiciona a planilha ao workbook.

    // Gera um nome de arquivo dinâmico baseado nos filtros aplicados.
    let nomeArquivo = 'aniversariantes';
    if (selectedMonth !== undefined) {
      nomeArquivo += `_${months[selectedMonth]}_${selectedYear}`;
    } else if (selectedPeriod !== 'all') {
      nomeArquivo += `_${selectedPeriod}`;
    }

    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`); // Inicia o download do arquivo.
  };

  // Função para exportar os dados para um arquivo PDF.
  const exportarParaPDF = () => {
    if (!birthdays || birthdays.length === 0) {
      alert('Nenhum aniversariante para exportar');
      return;
    }

    const doc = new jsPDF(); // Cria uma nova instância do documento PDF.

    // Adiciona o título ao PDF.
    doc.setFontSize(18);
    doc.text('Lista de Aniversariantes', 14, 20);

    // Adiciona um subtítulo dinâmico com os filtros aplicados.
    doc.setFontSize(10);
    let subtitulo = 'Filtros: ';
    if (selectedMonth !== undefined) {
      subtitulo += `${months[selectedMonth]} ${selectedYear}`;
    } else if (selectedPeriod !== 'all') {
      const periodos: Record<string, string> = {
        'this-month': 'Este Mês',
        'next-month': 'Próximo Mês',
        'quarter': 'Próximos 3 Meses',
        'year': 'Este Ano'
      };
      subtitulo += periodos[selectedPeriod] || selectedPeriod;
    } else {
      subtitulo += 'Todos';
    }
    if (selectedLocal !== 'all') {
      const localNome = locais.find(l => l.id === selectedLocal)?.nome || '';
      subtitulo += ` | Local: ${localNome}`;
    }
    doc.text(subtitulo, 14, 28);

    // Mapeia os dados para o formato de tabela do jsPDF-autotable.
    const tableData = birthdays.map(b => [
      b.name,
      b.currentAge.toString(),
      `${b.turningAge} anos`,
      b.birthDate,
      b.location,
      b.daysUntil === 0 ? 'Hoje!' : b.daysUntil === 1 ? 'Amanhã' : `${b.daysUntil} dias`
    ]);

    // Gera a tabela no PDF.
    autoTable(doc, {
      head: [['Nome', 'Idade', 'Fará', 'Data', 'Local', 'Falta']],
      body: tableData,
      startY: 35, // Posição inicial da tabela.
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }, // Cor do cabeçalho.
    });

    // Gera o nome do arquivo e inicia o download.
    let nomeArquivo = 'aniversariantes';
    if (selectedMonth !== undefined) {
      nomeArquivo += `_${months[selectedMonth]}_${selectedYear}`;
    } else if (selectedPeriod !== 'all') {
      nomeArquivo += `_${selectedPeriod}`;
    }

    doc.save(`${nomeArquivo}.pdf`);
  };

  // --- RENDERIZAÇÃO DO COMPONENTE (JSX) ---
  return (
    <div className="space-y-6">
      {/* Seção do Cabeçalho da Página */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <div className="gradient-accent p-1.5 sm:p-2 rounded-lg">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            Aniversários
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie e acompanhe os aniversários das crianças cadastradas
          </p>
        </div>

        {/* Botão de Exportar com Opções (Excel/PDF) */}
        <div className="flex gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 text-sm w-full sm:w-auto">
                <Download className="h-4 w-4" />
                <span className="hidden xs:inline">Exportar Lista</span>
                <span className="xs:hidden">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportarParaExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar como Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarParaPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-red-600" />
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Seção de Filtros */}
      <Card className="shadow-subtle overflow-hidden">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Filtros Gerais: Busca por nome e seleção de local */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Filtrar por local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os locais</SelectItem>
                  {/* Mapeia a lista de locais para criar as opções do seletor. */}
                  {locais.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros de Data */}
            <div className="border-t pt-3 sm:pt-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Filtrar por data:
              </p>

              {/* Botões para alternar entre Filtros Rápidos e Data Específica */}
              <div className="flex gap-2 mb-3 sm:mb-4 w-full">
                <Button
                  variant={tipoFiltro === 'rapido' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => {
                    setTipoFiltro('rapido');
                    setSelectedMonth(undefined); // Limpa o filtro de mês ao trocar.
                  }}
                >
                  <span className="hidden xs:inline">Filtros Rápidos</span>
                  <span className="xs:hidden">Rápidos</span>
                </Button>
                <Button
                  variant={tipoFiltro === 'personalizado' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => {
                    setTipoFiltro('personalizado');
                    setSelectedPeriod('all'); // Limpa o filtro de período ao trocar.
                  }}
                >
                  <span className="hidden xs:inline">Data Específica</span>
                  <span className="xs:hidden">Específica</span>
                </Button>
              </div>

              {/* Renderização Condicional: Mostra os filtros rápidos se `tipoFiltro` for 'rapido' */}
              {tipoFiltro === 'rapido' && (
                <div className="w-full">
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      <SelectItem value="this-month">Este mês</SelectItem>
                      <SelectItem value="next-month">Próximo mês</SelectItem>
                      <SelectItem value="quarter">Próximos 3 meses</SelectItem>
                      <SelectItem value="year">Este ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Renderização Condicional: Mostra os filtros de data específica se `tipoFiltro` for 'personalizado' */}
              {tipoFiltro === 'personalizado' && (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <Select
                    value={selectedMonth?.toString() || "all"}
                    onValueChange={(value) => setSelectedMonth(value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" className="max-h-[300px]">
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" className="max-h-[300px]">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Seção de "Filtros Ativos": Mostra os filtros aplicados e permite removê-los individualmente ou todos de uma vez. */}
            {hasActiveFilters && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
                <div className="flex items-start sm:items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Filtros ativos:
                  </span>

                  {/* Mostra o badge do filtro de busca se estiver ativo */}
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Busca: "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}"
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSearchTerm("")}
                      />
                    </Badge>
                  )}

                  {/* E assim por diante para cada filtro... */}
                  {selectedLocal !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Local: {(locais.find(l => l.id === selectedLocal)?.nome || selectedLocal).length > 20
                        ? (locais.find(l => l.id === selectedLocal)?.nome || selectedLocal).substring(0, 20) + '...'
                        : (locais.find(l => l.id === selectedLocal)?.nome || selectedLocal)}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedLocal("all")}
                      />
                    </Badge>
                  )}

                  {tipoFiltro === 'rapido' && selectedPeriod !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {
                        selectedPeriod === "this-month" ? "Este Mês" :
                        selectedPeriod === "next-month" ? "Próximo Mês" :
                        selectedPeriod === "quarter" ? "3 Meses" : "Este Ano"
                      }
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedPeriod("all")}
                      />
                    </Badge>
                  )}

                  {tipoFiltro === 'personalizado' && selectedMonth !== undefined && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {months[selectedMonth]} {selectedYear}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => {
                          setSelectedMonth(undefined);
                        }}
                      />
                    </Badge>
                  )}
                </div>

                {/* Botão para limpar todos os filtros de uma vez */}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto">
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Limpar Todos
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Renderização Condicional: Mostra um spinner enquanto as estatísticas estão carregando. */}
        {statsLoading ? (
          <div className="col-span-full">
            <LoadingSpinner size="lg" text="Carregando estatísticas..." className="py-12" />
          </div>
        ) : (
          // Quando o carregamento termina, mostra os cards de estatísticas.
          <>
            <Card className="gradient-primary text-white shadow-elegant">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm">Este Mês</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.thisMouth || 0}</p>
                  </div>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>
            {/* ... outros cards de estatísticas ... */}
            <Card className="gradient-warm text-white shadow-elegant">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm whitespace-nowrap">Esta Semana</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.thisWeek || 0}</p>
                  </div>
                  <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-secondary text-white shadow-elegant">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm">
                      <span className="hidden sm:inline">Próximos 30 dias</span>
                      <span className="sm:hidden">30 dias</span>
                    </p>
                    <p className="text-xl sm:text-2xl font-bold">{stats?.next30Days || 0}</p>
                  </div>
                  <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-white/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-muted-foreground/20">
              <CardContent className="p-3 sm:p-6 text-center">
                <p className="text-muted-foreground text-xs sm:text-sm">Idade Média</p>
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats?.averageAge || 0} {stats?.averageAge === 1 ? 'ano' : 'anos'}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Seção da Lista de Aniversariantes */}
      <Card className="shadow-elegant overflow-hidden">
        <CardHeader className="px-3 sm:px-6 py-4 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {/* Título dinâmico que reflete o filtro de data selecionado. */}
            <span className="truncate">
              {selectedMonth !== undefined
                ? `${months[selectedMonth]} ${selectedYear}`
                : selectedPeriod !== "all"
                  ? selectedPeriod === "this-month" ? "Este Mês" :
                    selectedPeriod === "next-month" ? "Próximo Mês" :
                    selectedPeriod === "quarter" ? "3 Meses" : "Este Ano"
                  : "Próximos Aniversários"
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
            {/* Renderização Condicional Tripla: */}
            {birthdaysLoading ? (
              // 1. Se estiver carregando, mostra o spinner.
              <LoadingSpinner size="lg" text="Carregando aniversários..." className="py-12" />
            ) : birthdays && birthdays.length > 0 ? (
              // 2. Se o carregamento terminou e há dados, mapeia e renderiza a lista.
              birthdays.map((birthday) => (
              <div
                key={birthday.id} // A `key` é crucial para o React otimizar a renderização de listas.
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-card-border hover:bg-muted/50 transition-smooth"
              >
                {/* Informações principais da criança */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs sm:text-sm">
                      {/* Gera as iniciais do nome para o avatar. */}
                      {birthday.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{birthday.name}</h4>
                      {/* Badge "Urgente" para aniversários nos próximos 7 dias. */}
                      {birthday.daysUntil <= 7 && (
                        <Badge variant="destructive" className="animate-bounce-gentle text-xs">
                          Urgente!
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="truncate">📍 {birthday.location}</span>
                      <span className="whitespace-nowrap">🎂 {birthday.turningAge} {birthday.turningAge === 1 ? 'ano' : 'anos'}</span>
                      <span className="hidden sm:inline whitespace-nowrap">📅 {birthday.birthDate}</span>
                    </div>
                  </div>
                </div>

                {/* Informações de tempo e ações */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-bold text-primary">
                      {/* Lógica para exibir "Hoje!", "Amanhã" ou o número de dias. */}
                      {birthday.daysUntil === 0 ? "Hoje!" :
                       birthday.daysUntil === 1 ? "Amanhã" :
                       `${birthday.daysUntil} ${birthday.daysUntil === 1 ? 'dia' : 'dias'}`}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {birthday.currentAge} → {birthday.turningAge} {birthday.turningAge === 1 ? 'ano' : 'anos'}
                    </p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs sm:text-sm px-2 sm:px-3"
                      onClick={() => {
                        setSelectedChild(birthday);
                        setProfileDialogOpen(true);
                      }}
                    >
                      <span className="hidden sm:inline">Ver Perfil</span>
                      <span className="sm:hidden">Perfil</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="px-2 sm:px-3"
                      onClick={() => {
                        setSelectedChild(birthday);
                        setGiftDialogOpen(true);
                      }}
                      title="Registrar presente de aniversário"
                    >
                      <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
            ) : (
              // 3. Se não está carregando e não há dados, mostra o componente `EmptyState`.
              <EmptyState
                icon={Calendar}
                title="Nenhum aniversário encontrado"
                description={
                  hasActiveFilters
                    ? "Nenhum aniversário corresponde aos filtros aplicados. Tente ajustar os critérios de busca."
                    : "Nenhum aniversário está programado para o período selecionado."
                }
                actionLabel={hasActiveFilters ? "Limpar Filtros" : undefined}
                onAction={hasActiveFilters ? clearFilters : undefined}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogos (Modais) */}
      {/* Estes componentes são renderizados aqui, mas só se tornam visíveis quando seu estado `open` é `true`. */}
      {/* Eles recebem os dados da criança selecionada (`selectedChild`) como propriedade. */}
      
      {/* Diálogo para registrar um presente de aniversário. */}
      <GiftDialog
        open={giftDialogOpen}
        onOpenChange={setGiftDialogOpen}
        child={selectedChild}
      />

      {/* Diálogo para exibir o perfil completo da criança. */}
      <ChildProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        child={selectedChild}
      />
    </div>
  );
}