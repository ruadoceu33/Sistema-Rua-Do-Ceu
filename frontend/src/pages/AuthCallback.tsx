// Importa hooks do React e do React Router DOM.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// Importa o hook `useAuth` para interagir com o contexto de autenticação.
import { useAuth } from '../contexts/AuthContext';
// Importa um ícone de carregamento.
import { Loader2 } from 'lucide-react';

/**
 * Componente AuthCallback
 * 
 * Esta é uma página de "callback" (retorno) crucial para o fluxo de autenticação OAuth 2.0 com Google.
 * Após o usuário autorizar o acesso na tela do Google, o Google redireciona o navegador de volta para esta página.
 * A URL conterá parâmetros de busca (query params) com os tokens de acesso e de atualização, ou um erro.
 * 
 * O trabalho deste componente é:
 * 1. Extrair os tokens (ou erro) da URL.
 * 2. Salvar os tokens no `localStorage` para manter o usuário logado.
 * 3. Usar o token de acesso para buscar os dados do perfil do usuário no backend.
 * 4. Atualizar o estado global de autenticação (AuthContext).
 * 5. Redirecionar o usuário para a página principal da aplicação.
 */
export default function AuthCallback() {
  // `useSearchParams` é um hook para ler os parâmetros da URL (ex: ?access_token=...).
  const [searchParams] = useSearchParams();
  // `useNavigate` permite redirecionar o usuário para outras páginas.
  const navigate = useNavigate();
  // `useAuth` nos dá acesso à função `setAuthUser` do nosso contexto de autenticação.
  const { setAuthUser } = useAuth();
  // Estado para armazenar qualquer mensagem de erro que ocorra durante o processo.
  const [error, setError] = useState<string | null>(null);
  // Estado para garantir que o processo de callback seja executado apenas uma vez.
  const [processed, setProcessed] = useState(false);

  // `useEffect` é usado para executar a lógica de processamento do callback assim que o componente é montado.
  useEffect(() => {
    // Se já processamos o callback, não fazemos nada para evitar execuções múltiplas e inesperadas.
    if (processed) return;

    const processCallback = async () => {
      try {
        setProcessed(true); // Marca como processado imediatamente.

        // Extrai os tokens e possíveis erros da URL.
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');

        // Se o backend redirecionou com um parâmetro de erro, exibimos uma mensagem apropriada.
        if (errorParam) {
          const errorMessages: Record<string, string> = {
            invalid_state: 'Erro de segurança (state inválido). Tente novamente.',
            no_code: 'Código de autorização não recebido. Tente novamente.',
            oauth_error: 'Erro na autenticação com Google. Tente novamente.',
            account_inactive: 'Sua conta está desativada. Entre em contato com o administrador.'
          };

          setError(errorMessages[errorParam] || 'Erro desconhecido ao fazer login.');

          // Agenda um redirecionamento de volta para a página de login após 3 segundos.
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
          return; // Interrompe a execução.
        }

        // Valida se os tokens foram realmente recebidos.
        if (!accessToken || !refreshToken) {
          setError('Tokens não recebidos do servidor.');
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
          return;
        }

        // **PERSISTÊNCIA DA SESSÃO**
        // Armazena os tokens no `localStorage` do navegador. Isso é o que mantém o usuário logado
        // mesmo que ele feche a aba ou o navegador e volte mais tarde.
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        // Com o token de acesso em mãos, buscamos os dados do usuário no endpoint `/auth/me` do backend.
        // Enviamos o token no cabeçalho `Authorization` para provar que estamos autenticados.
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao buscar dados do usuário');
        }

        const userData = await response.json();

        // Monta o objeto de perfil do usuário com os dados recebidos.
        const userProfile = {
          id: userData.id,
          nome: userData.nome,
          email: userData.email,
          role: userData.role || 'user',
          telefone: userData.telefone,
          ativo: userData.ativo
        };

        // Salva também o perfil do usuário no `localStorage` para acesso rápido em toda a aplicação.
        localStorage.setItem('user', JSON.stringify(userProfile));

        // Atualiza o estado global da aplicação (AuthContext) com os dados do usuário.
        // Isso torna os dados do usuário disponíveis para todos os componentes que usam `useAuth()`.
        setAuthUser(userProfile);

        // Redireciona o usuário para a página inicial (Dashboard) após um pequeno atraso.
        setTimeout(() => {
          navigate('/');
        }, 100);


      } catch (err) {
        console.error('Erro ao processar callback:', err);
        setError('Erro ao processar autenticação. Tente novamente.');

        // Em caso de qualquer erro, limpa os tokens e redireciona para o login.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    processCallback();
    // O array de dependências garante que o `useEffect` seja re-executado se alguma dessas variáveis mudar.
  }, [searchParams, navigate, setAuthUser, processed]);

  // --- RENDERIZAÇÃO (JSX) ---
  // A interface desta página é simples: mostra um estado de erro ou um estado de carregamento.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {/* Se ocorreu um erro, exibe a mensagem de erro. */}
        {error ? (
          <>
            <div className="text-red-500 text-5xl mb-4">✕</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Erro na Autenticação
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Redirecionando para login...
            </p>
          </>
        ) : (
          /* Caso contrário, exibe uma tela de carregamento enquanto o processo acontece no `useEffect`. */
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Processando Login
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto finalizamos sua autenticação...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
