import { apiClient } from '@/lib/api';

export interface CheckinValidationResult {
  canCheckIn: boolean;
  message: string;
  existingCheckin?: any;
}

export async function validateCheckin(
  criancaId: string,
  localId?: string,
  date?: string
): Promise<CheckinValidationResult> {
  try {
    const result = await apiClient.validateCheckin(criancaId);
    return result;
  } catch (error: any) {
    return {
      canCheckIn: false,
      message: error.message || 'Erro interno ao validar check-in'
    };
  }
}