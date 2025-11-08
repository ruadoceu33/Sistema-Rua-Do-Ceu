/**
 * Cliente HTTP para comunicação com a API backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types
export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    nome: string;
    email: string;
    role: string;
    telefone?: string;
  };
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Novos tipos para autenticação avançada
export interface GoogleAuthData {
  credential: string;
}

export interface GoogleAuthResponse {
  message: string;
  needsApproval?: boolean;
  access_token?: string;
  refresh_token?: string;
  user: {
    id: string;
    nome: string;
    email: string;
    role?: string;
    status_aprovacao?: string;
    locais?: any[];
  };
}

export interface EsqueciSenhaData {
  email: string;
}

export interface ResetarSenhaData {
  token: string;
  novaSenha: string;
}

export interface ValidarTokenResetResponse {
  valid: boolean;
}

export interface AprovarColaboradorData {
  locais: string[]; // Array de IDs de locais (mínimo 1)
}

export interface ColaboradorPendente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
  ativo: boolean;
  status_aprovacao: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para adicionar token de autenticação
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para tratar erros de autenticação
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Se o erro for 401 (Unauthorized) e não for uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Tentar refresh do token
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await this.client.post('auth/refresh', {
              refreshToken
            }, {
              _retry: true // Marcar para não tentar refresh novamente
            } as any);

            const { access_token, refresh_token: newRefreshToken } = response.data;

            localStorage.setItem('access_token', access_token);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }

            // Retentar a requisição original com o novo token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Se o refresh falhar, limpar tokens IMEDIATAMENTE
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');

            // Redirecionar para login apenas se não estiver já na página de auth
            if (!window.location.pathname.includes('/auth')) {
              window.location.href = '/auth';
            }

            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.client.post('auth/login', data);
    return response.data;
  }

  async getCurrentUser(): Promise<AuthResponse['user']> {
    const response = await this.client.get('auth/me');
    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.client.post('auth/refresh');
    return response.data;
  }

  // Google OAuth
  async googleAuth(data: GoogleAuthData): Promise<GoogleAuthResponse> {
    const response = await this.client.post('auth/google', data);
    return response.data;
  }

  // Recuperação de Senha
  async esqueciSenha(data: EsqueciSenhaData): Promise<ApiResponse> {
    const response = await this.client.post('auth/esqueci-senha', data);
    return response.data;
  }

  async validarTokenReset(token: string): Promise<ValidarTokenResetResponse> {
    const response = await this.client.get(`auth/validar-token-reset?token=${token}`);
    return response.data;
  }

  async resetarSenha(data: ResetarSenhaData): Promise<ApiResponse> {
    const response = await this.client.post('auth/resetar-senha', data);
    return response.data;
  }

  // Crianças endpoints
  async getCriancas(params?: {
    ativo?: boolean;
    local_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('criancas', {
      params: {
        ...params,
        // Se não especificar page, pega todas (para aniversários e casos específicos)
        limit: params?.limit || (params?.page ? 15 : 1000),
        page: params?.page || 1
      }
    });
    // Backend retorna { data: [], pagination: {} }
    // Se tem pagination, retorna o objeto completo, senão retorna só os dados
    if (response.data.pagination) {
      return response.data;
    }
    return { data: response.data.data || response.data, pagination: null };
  }

  async createCrianca(data: any) {
    const response = await this.client.post('criancas', data);
    return response.data;
  }

  async updateCrianca(id: string, data: any) {
    const response = await this.client.put(`criancas/${id}`, data);
    return response.data;
  }

  async deleteCrianca(id: string) {
    const response = await this.client.delete(`criancas/${id}`);
    return response.data;
  }

  async getHistoricoDoacoesCrianca(
    criancaId: string,
    params?: {
      page?: number;
      limit?: number;
      tipo?: string;
      local_id?: string;
      data_inicio?: string;
      data_fim?: string;
    }
  ) {
    const response = await this.client.get(`criancas/${criancaId}/historico-doacoes`, {
      params: {
        ...params,
        limit: params?.limit || 20,
        page: params?.page || 1
      }
    });
    return response.data;
  }

  // Locais endpoints
  async getLocais(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('locais', {
      params: {
        ...params,
        limit: params?.limit || (params?.page ? 15 : 1000),
        page: params?.page || 1
      }
    });
    // Backend retorna { data: [], pagination: {} }
    if (response.data.pagination) {
      return response.data;
    }
    return { data: response.data.data || response.data, pagination: null };
  }

  async createLocal(data: any) {
    const response = await this.client.post('locais', data);
    return response.data;
  }

  async updateLocal(id: string, data: any) {
    const response = await this.client.put(`locais/${id}`, data);
    return response.data;
  }

  async deleteLocal(id: string) {
    const response = await this.client.delete(`locais/${id}`);
    return response.data;
  }

  // Tags de Saúde endpoints
  async getTagsSaude() {
    const response = await this.client.get('tags-saude');
    return response.data;
  }

  async createTagSaude(data: { nome: string; cor?: string }) {
    const response = await this.client.post('tags-saude', data);
    return response.data;
  }

  async updateTagSaude(id: string, data: { nome?: string; cor?: string }) {
    const response = await this.client.put(`tags-saude/${id}`, data);
    return response.data;
  }

  async deleteTagSaude(id: string) {
    const response = await this.client.delete(`tags-saude/${id}`);
    return response.data;
  }

  // Doações endpoints
  async getDoacoes(params?: {
    local_id?: string;
    tipo_doacao?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('doacoes', {
      params: {
        ...params,
        limit: params?.limit || (params?.page ? 15 : 1000),
        page: params?.page || 1
      }
    });
    // Backend retorna { data: [], pagination: {} }
    if (response.data.pagination) {
      return response.data;
    }
    return { data: response.data.data || response.data, pagination: null };
  }

  async createDoacao(data: any) {
    const response = await this.client.post('doacoes', data);
    return response.data;
  }

  async updateDoacao(id: string, data: any) {
    const response = await this.client.put(`doacoes/${id}`, data);
    return response.data;
  }

  async deleteDoacao(id: string) {
    const response = await this.client.delete(`doacoes/${id}`);
    return response.data;
  }

  // Relatórios - Histórico de Criança
  async getHistoricoCrianca(
    criancaId: string,
    params?: {
      page?: number;
      limit?: number;
      tipo?: string;
      descricao?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const response = await this.client.get(`relatorios/historico-crianca/${criancaId}`, {
      params
    });
    return response.data;
  }

  // Relatórios - Prestação de Contas
  async getPrestacaoContas(params?: {
    startDate?: string;
    endDate?: string;
    localId?: string;
    tipo?: string;
    descricao?: string;
  }) {
    const response = await this.client.get('relatorios/prestacao-contas', {
      params
    });
    return response.data;
  }

  // Relatórios - Aniversariantes do Mês
  async getAniversariosMes(params: {
    month?: number; // Opcional - se não fornecido, busca todos os meses
    year?: number;
    localId?: string;
  }) {
    const response = await this.client.get('relatorios/aniversarios-mes', {
      params
    });
    return response.data;
  }

  // Relatórios - Frequência
  async getFrequencia(params?: {
    startDate?: string;
    endDate?: string;
    localId?: string;
  }) {
    const response = await this.client.get('relatorios/frequencia', {
      params
    });
    return response.data;
  }

  async getHistoricoConsumoDoacao(
    doacaoId: string,
    params?: {
      page?: number;
      limit?: number;
      data_inicio?: string;
      data_fim?: string;
    }
  ) {
    const response = await this.client.get(`doacoes/${doacaoId}/historico-consumo`, {
      params: {
        ...params,
        limit: params?.limit || 20,
        page: params?.page || 1
      }
    });
    return response.data;
  }

  // Check-ins endpoints
  async getCheckins(params?: {
    local_id?: string;
    crianca_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('checkins', {
      params: {
        ...params,
        limit: params?.limit || (params?.page ? 16 : 1000), // 16 para grid de 2 colunas
        page: params?.page || 1
      }
    });
    // Backend retorna { data: [], pagination: {} }
    if (response.data.pagination) {
      return response.data;
    }
    return { data: response.data.data || response.data, pagination: null };
  }

  async createCheckin(data: any) {
    const response = await this.client.post('checkins', data);
    return response.data;
  }

  async createBulkCheckin(data: { checkins: any[] }) {
    const response = await this.client.post('checkins/bulk', data);
    return response.data;
  }

  async validateCheckin(crianca_id: string) {
    const response = await this.client.get(`checkins/validation/${crianca_id}`);
    return response.data;
  }
  async deleteCheckin(id: string) {
    const response = await this.client.delete(`checkins/${id}`);
    return response.data;
  }


  // Colaboradores endpoints (Admin)
  async getColaboradores(params?: {
    ativo?: boolean;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('colaboradores', {
      params: {
        ...params,
        limit: params?.limit || (params?.page ? 15 : 1000),
        page: params?.page || 1
      }
    });
    // Backend retorna { data: [], pagination: {} }
    if (response.data.pagination) {
      return response.data;
    }
    return { data: response.data.data || response.data, pagination: null };
  }

  async createColaborador(data: any) {
    const response = await this.client.post('colaboradores', data);
    return response.data;
  }

  async updateColaborador(id: string, data: any) {
    const response = await this.client.put(`colaboradores/${id}`, data);
    return response.data;
  }

  async toggleColaboradorStatus(id: string) {
    const response = await this.client.patch(`colaboradores/${id}`);
    return response.data;
  }

  async resetColaboradorPassword(id: string, data: { new_password: string }) {
    const response = await this.client.post(`colaboradores/${id}/reset-password`, data);
    return response.data;
  }

  // Aprovação de Colaboradores
  async getColaboradoresPendentes(): Promise<{ data: ColaboradorPendente[]; total: number }> {
    const response = await this.client.get('colaboradores/pendentes');
    return response.data;
  }

  async aprovarColaborador(id: string, data: AprovarColaboradorData): Promise<ApiResponse> {
    const response = await this.client.put(`colaboradores/${id}/aprovar`, data);
    return response.data;
  }

  // Relatórios endpoints
  async getDashboardStats() {
    const response = await this.client.get('relatorios/dashboard');
    return response.data;
  }

  async getRecentActivity(days?: number) {
    const response = await this.client.get('relatorios/atividade', {
      params: { days }
    });
    return response.data;
  }

  async getBirthdayChildren(month?: number, year?: number) {
    const response = await this.client.get('relatorios/aniversarios', {
      params: { month, year }
    });
    return response.data;
  }

  // Novos endpoints de análise de doações
  async getAnaliseDoacoes(params?: {
    startDate?: string;
    endDate?: string;
    localId?: string;
  }) {
    const response = await this.client.get('relatorios/analise-doacoes', {
      params
    });
    return response.data;
  }

  async getRankingUrgencia(params?: {
    localId?: string;
    limit?: number;
  }) {
    const response = await this.client.get('relatorios/ranking-urgencia', {
      params
    });
    return response.data;
  }

  async getTaxaCobertura(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('relatorios/taxa-cobertura', {
      params
    });
    return response.data;
  }

  async exportarRelatorioExcel(data: {
    startDate?: string;
    endDate?: string;
    localId?: string;
    tipoRelatorio?: string;
  }) {
    const response = await this.client.post('relatorios/exportar-excel', data);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;