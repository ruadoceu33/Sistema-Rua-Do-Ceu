import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  showGoToPage?: boolean;
  showTotalItems?: boolean;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationControlsProps) {

  // Gerar array de páginas para mostrar (estilo Amazon)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Se tem 7 ou menos páginas, mostra todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostra primeira página
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Páginas ao redor da página atual
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Sempre mostra última página
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Botão Anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-9 px-3"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Anterior
      </Button>

      {/* Números das páginas */}
      {getPageNumbers().map((page, index) => (
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page as number)}
            className={`h-9 w-9 p-0 ${
              currentPage === page
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : ""
            }`}
          >
            {page}
          </Button>
        )
      ))}

      {/* Botão Próximo */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-9 px-3"
      >
        Próximo
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </nav>
  );
}
