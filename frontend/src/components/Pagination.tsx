import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showTotal?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal = true,
  className = ""
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Gerar array de páginas visíveis
  const getVisiblePages = () => {
    const delta = 2; // Quantas páginas mostrar de cada lado
    const range: (number | string)[] = [];

    // Sempre mostrar primeira página
    range.push(1);

    // Calcular range do meio
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    // Adicionar ... se necessário antes do range
    if (rangeStart > 2) {
      range.push('...');
    }

    // Adicionar páginas do meio
    for (let i = rangeStart; i <= rangeEnd; i++) {
      range.push(i);
    }

    // Adicionar ... se necessário depois do range
    if (rangeEnd < totalPages - 1) {
      range.push('...');
    }

    // Sempre mostrar última página (se houver mais de 1)
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const visiblePages = getVisiblePages();

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Total de itens */}
      {showTotal && (
        <div className="text-sm text-muted-foreground">
          Mostrando <strong>{startItem}</strong> a <strong>{endItem}</strong> de{" "}
          <strong>{totalItems}</strong> {totalItems === 1 ? "item" : "itens"}
        </div>
      )}

      {/* Controles de paginação */}
      <div className="flex items-center gap-2">
        {/* Primeira página */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Info mobile */}
        <div className="sm:hidden text-sm font-medium">
          Página {currentPage} de {totalPages}
        </div>

        {/* Próxima página */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de tamanho de página */}
      {showSizeChanger && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Itens por página:
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              onPageSizeChange(parseInt(value));
              onPageChange(1); // Voltar para primeira página ao mudar tamanho
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
