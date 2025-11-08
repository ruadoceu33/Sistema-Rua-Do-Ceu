/**
 * Utilitários para formatação e validação de telefones brasileiros
 * Suporta celulares (11 dígitos) e fixos (10 dígitos)
 */

/**
 * Remove caracteres não numéricos de um telefone
 */
export function cleanPhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Formata telefone brasileiro automaticamente
 * - Se tem 11 dígitos: (XX) 9XXXX-XXXX (celular)
 * - Se tem 10 dígitos: (XX) XXXX-XXXX (fixo)
 */
export function formatPhoneInput(value: string): string {
  const cleaned = cleanPhone(value);

  // Limitar a 11 dígitos
  const limited = cleaned.slice(0, 11);

  if (limited.length === 0) return '';

  // (XX
  if (limited.length <= 2) {
    return `(${limited}`;
  }

  // (XX)
  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }

  // Celular: (XX) 9XXXX-XXXX (11 dígitos)
  if (limited.length === 11) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }

  // Fixo: (XX) XXXX-XXXX (10 dígitos)
  if (limited.length === 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }

  // Durante digitação (entre 7 e 10 dígitos)
  if (limited.length > 6) {
    // Tentar detectar se é celular (3º dígito é 9)
    const thirdDigit = limited.charAt(2);

    if (thirdDigit === '9' && limited.length > 7) {
      // Formato de celular em progresso
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    } else {
      // Formato de fixo em progresso
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    }
  }

  return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
}

/**
 * Hook personalizado para input de telefone com formatação automática
 */
export function usePhoneInput(
  value: string,
  onChange: (value: string) => void
) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    onChange(formatted);
  };

  return {
    value: value || '',
    onChange: handleChange,
    placeholder: '(00) 00000-0000',
    maxLength: 15, // (XX) 9XXXX-XXXX
  };
}

/**
 * Valida se o telefone tem formato correto (10 ou 11 dígitos)
 */
export function isValidPhoneLength(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Retorna mensagem de erro amigável para validação
 */
export function getPhoneValidationMessage(phone: string): string {
  const cleaned = cleanPhone(phone);

  if (cleaned.length === 0) {
    return 'Telefone é obrigatório';
  }

  if (cleaned.length < 10) {
    return 'Telefone incompleto. Use (DDD) XXXX-XXXX para fixo ou (DDD) 9XXXX-XXXX para celular';
  }

  if (cleaned.length > 11) {
    return 'Telefone com dígitos demais';
  }

  // Verificar se celular (11 dígitos) começa com 9
  if (cleaned.length === 11 && cleaned.charAt(2) !== '9') {
    return 'Celular deve começar com 9 após o DDD';
  }

  // Verificar se fixo (10 dígitos) não começa com 9
  if (cleaned.length === 10 && cleaned.charAt(2) === '9') {
    return 'Número parece ser celular, mas está faltando um dígito';
  }

  return '';
}
