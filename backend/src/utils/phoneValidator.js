/**
 * Validador de telefones brasileiros
 * Aceita tanto celulares (11 dígitos) quanto fixos (10 dígitos)
 *
 * Formatos aceitos:
 * - Celular: (DDD) 9XXXX-XXXX ou DDD9XXXXXXXX (11 dígitos)
 * - Fixo: (DDD) XXXX-XXXX ou DDXXXXXXXXX (10 dígitos)
 */

/**
 * Remove caracteres não numéricos de um telefone
 * @param {string} phone - Telefone com ou sem formatação
 * @returns {string} - Apenas os dígitos do telefone
 */
function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Valida se é um telefone brasileiro válido (celular ou fixo)
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean} - true se válido, false caso contrário
 */
function isValidBrazilianPhone(phone) {
  const cleaned = cleanPhone(phone);

  // Deve ter 10 dígitos (fixo) ou 11 dígitos (celular)
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return false;
  }

  // Extrair DDD (2 primeiros dígitos)
  const ddd = parseInt(cleaned.substring(0, 2));

  // DDDs válidos no Brasil (11 a 99, exceto alguns)
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99 // MA
  ];

  if (!validDDDs.includes(ddd)) {
    return false;
  }

  // Se tem 11 dígitos, deve começar com 9 (celular)
  if (cleaned.length === 11) {
    const thirdDigit = cleaned.charAt(2);
    if (thirdDigit !== '9') {
      return false;
    }
  }

  // Se tem 10 dígitos, não pode começar com 9 (fixo)
  if (cleaned.length === 10) {
    const thirdDigit = cleaned.charAt(2);
    if (thirdDigit === '9') {
      return false;
    }
  }

  // Rejeitar números com todos os dígitos iguais (ex: 11111111111, 99999999999)
  // NOTA: Isto NÃO bloqueia o mesmo número sendo usado múltiplas vezes no sistema
  // (importante para irmãos que compartilham o mesmo telefone do responsável)
  const allSameDigit = cleaned.split('').every(digit => digit === cleaned[0]);
  if (allSameDigit) {
    return false;
  }

  return true;
}

/**
 * Formata um telefone brasileiro
 * @param {string} phone - Telefone a ser formatado
 * @returns {string} - Telefone formatado
 */
function formatBrazilianPhone(phone) {
  const cleaned = cleanPhone(phone);

  if (!isValidBrazilianPhone(phone)) {
    return phone; // Retorna sem formatação se inválido
  }

  if (cleaned.length === 11) {
    // Celular: (XX) 9XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }

  return phone;
}

/**
 * Custom validator para express-validator
 * Uso: body('telefone').custom(validateBrazilianPhone)
 */
function validateBrazilianPhone(value) {
  if (!value) return true; // Se opcional, permite vazio

  if (!isValidBrazilianPhone(value)) {
    throw new Error('Telefone inválido. Verifique o DDD e formato: (DDD) 9XXXX-XXXX para celular ou (DDD) XXXX-XXXX para fixo');
  }

  return true;
}

module.exports = {
  cleanPhone,
  isValidBrazilianPhone,
  formatBrazilianPhone,
  validateBrazilianPhone
};
