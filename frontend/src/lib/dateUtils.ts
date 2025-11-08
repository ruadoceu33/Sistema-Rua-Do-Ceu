import { format } from 'date-fns';

/**
 * Formata uma string de data (ISO) para o formato YYYY-MM-DD,
 * ideal para uso em inputs HTML do tipo "date".
 * @param dateString A data em formato de string (ex: "2023-12-29T00:00:00.000Z")
 * @returns A data formatada como "YYYY-MM-DD" ou uma string vazia se a entrada for inválida.
 */
export const formatDateForInput = (dateString: string | Date): string => {
  if (!dateString) {
    return '';
  }
  try {
    return format(new Date(dateString), 'yyyy-MM-dd');
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return '';
  }
};

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * @param dateString A data em formato de string (ex: "2023-12-29T00:00:00.000Z")
 * @returns A data formatada como "DD/MM/YYYY" ou uma string vazia se a entrada for inválida.
 */
export const formatDateForDisplay = (dateString: string | Date): string => {
  if (!dateString) {
    return '';
  }
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return '';
  }
};
