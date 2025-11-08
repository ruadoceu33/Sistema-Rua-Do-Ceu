// Importa o hook `useState` do React para gerenciar o estado local do componente (ex: loading).
import { useState } from 'react';
// Hook customizado `useAuth` que vem do nosso Contexto de Autenticação. Ele provê funções como `signIn`.
import { useAuth } from '@/contexts/AuthContext';
// Hook do React Router para navegar programaticamente entre as páginas.
import { useNavigate } from 'react-router-dom';
// Google OAuth SDK
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
// Importação de componentes de UI reutilizáveis para construir a interface.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
// Hook customizado para exibir "toasts" (pequenas notificações) para o usuário.
import { useToast } from '@/hooks/use-toast';
// `zod` é uma biblioteca para validação de esquemas. Usada para garantir que os dados do formulário são válidos.
import { z } from 'zod';
// `react-hook-form` é uma biblioteca para gerenciar formulários em React de forma eficiente.
import { useForm } from 'react-hook-form';
// O `zodResolver` é um adaptador para usar esquemas do `zod` com `react-hook-form`.
import { zodResolver } from '@hookform/resolvers/zod';
// Ícone de carregamento.
import { Loader2 } from 'lucide-react';
// Componentes para criar um Dialog (modal) para a funcionalidade de "esqueci a senha".
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Cliente de API centralizado.
import { apiClient } from '@/lib/api';
// Componente de instalação PWA
import { PWAInstallButton } from '@/components/PWAInstallButton';

// --- ESQUEMAS DE VALIDAÇÃO (ZOD) ---
// Define a "forma" que os dados do formulário de login devem ter.
// `z.object` cria um esquema para um objeto.
// `z.string().email()` valida se o campo é uma string e um email válido.
// `z.string().min(6)` valida se a senha tem no mínimo 6 caracteres.
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

// Esquema de validação para o formulário de "esqueci a senha".
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

// --- TIPOS (TYPESCRIPT) ---
// `z.infer` extrai o tipo TypeScript a partir de um esquema Zod. 
// Isso evita a duplicação de tipos e garante que o formulário e os dados estejam sincronizados.
type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Componente Auth
 * 
 * Esta página gerencia a autenticação do usuário, oferecendo duas opções:
 * 1. Login com Google (para colaboradores).
 * 2. Login com email e senha (para administradores).
 * Também inclui a funcionalidade de recuperação de senha.
 */
export default function Auth() {
  // --- ESTADO DO COMPONENTE ---
  const [loading, setLoading] = useState(false); // Estado de carregamento para o login de admin.
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false); // Controla a visibilidade do modal de "esqueci a senha".
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false); // Estado de carregamento para o envio do email de recuperação.
  
  // --- HOOKS ---
  const { signIn, signInWithGoogle } = useAuth(); // Obtém as funções de login do contexto de autenticação.
  const navigate = useNavigate(); // Para redirecionar o usuário após o login.
  const { toast } = useToast(); // Para mostrar notificações.

  // --- INICIALIZAÇÃO DOS FORMULÁRIOS ---
  // `useForm` inicializa o formulário de login.
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema), // Conecta o esquema de validação `loginSchema` ao formulário.
  });

  // Inicializa o formulário de recuperação de senha.
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // --- MANIPULADORES DE EVENTOS ---

  // Função chamada quando o formulário de login é submetido.
  // `data` é passado pelo `react-hook-form` e já foi validado pelo Zod.
  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);

    if (error) {
      // Trata erros específicos retornados pela API de login.
      if (error.code === 'PENDING_APPROVAL') {
        navigate('/aguardando-aprovacao'); // Redireciona para a página de "aguardando aprovação".
        toast({
          title: "Aguardando aprovação",
          description: "Sua conta está pendente de aprovação por um administrador.",
          variant: "destructive",
        });
      } else if (error.code === 'ACCOUNT_INACTIVE') {
        toast({
          title: "Conta desativada",
          description: "Sua conta está desativada. Entre em contato com um administrador.",
          variant: "destructive",
        });
      } else {
        // Erro genérico de login.
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Se não houver erro, o login foi bem-sucedido.
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
      navigate('/'); // Redireciona para a página principal (Dashboard).
    }
    setLoading(false);
  };

  // Função chamada quando o formulário de recuperação de senha é submetido.
  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setForgotPasswordLoading(true);
    try {
      // Chama o endpoint da API para iniciar o processo de recuperação de senha.
      await apiClient.esqueciSenha({ email: data.email });
      toast({
        title: "Email enviado!",
        description: "Confira sua caixa de entrada para redefinir sua senha.",
      });
      setForgotPasswordOpen(false); // Fecha o modal.
      forgotPasswordForm.reset(); // Limpa o formulário.
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || "Ocorreu um erro. Tente novamente.";
      toast({
        title: "Erro ao enviar email",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setForgotPasswordLoading(false);
  };

  // Função chamada quando o login com Google é bem-sucedido
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        title: "Erro no login",
        description: "Não foi possível obter as credenciais do Google.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error, needsApproval } = await signInWithGoogle(credentialResponse.credential);

    if (error) {
      toast({
        title: "Erro no login com Google",
        description: error.message,
        variant: "destructive",
      });
    } else if (needsApproval) {
      navigate('/aguardando-aprovacao');
      toast({
        title: "Aguardando aprovação",
        description: "Sua conta foi criada e está pendente de aprovação por um administrador.",
        variant: "default",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
      navigate('/');
    }
    setLoading(false);
  };

  // Função chamada quando o login com Google falha
  const handleGoogleError = () => {
    toast({
      title: "Erro no login com Google",
      description: "Não foi possível fazer login. Tente novamente.",
      variant: "destructive",
    });
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-full sm:max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl sm:text-3xl font-bold">Rua do Céu</CardTitle>
          <CardDescription className="text-sm sm:text-base">Sistema de Gestão Interno</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Seção de Login com Google (OAuth) para Colaboradores */}
          <div className="space-y-4">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                size="large"
                width="100%"
                text="continue_with"
                locale="pt-BR"
              />
            </div>

            {/* Divisor "Ou entre como admin" */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou entre como admin
                </span>
              </div>
            </div>
          </div>

          {/* Formulário de Login para Admin (email/senha) */}
          {/* `onSubmit` é ligado à função `handleSubmit` do `react-hook-form`, que valida os dados antes de chamar `handleLogin`. */}
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="admin@ruadoceu.org"
                className="text-sm sm:text-base"
                // `register` conecta este input ao `react-hook-form`, gerenciando seu estado, validação e eventos.
                {...loginForm.register('email')}
              />
              {/* Exibe a mensagem de erro para o campo de email, se houver. */}
              {loginForm.formState.errors.email && (
                <p className="text-xs sm:text-sm text-destructive">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm sm:text-base">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="text-sm sm:text-base"
                {...loginForm.register('password')}
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs sm:text-sm text-destructive">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <PWAInstallButton />
              <Button
                type="button"
                variant="link"
                className="px-0 text-xs sm:text-sm h-auto"
                onClick={() => setForgotPasswordOpen(true)} // Abre o modal de recuperação de senha.
              >
                Esqueci minha senha
              </Button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {/* Renderização condicional: mostra um spinner e texto de "Entrando..." durante o login. */}
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar como Admin'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>

      {/* Modal (Dialog) de "Esqueci a Senha" */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="w-full max-w-full sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Recuperar senha</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Digite seu email para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="text-sm sm:text-base"
                  {...forgotPasswordForm.register('email')}
                />
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-xs sm:text-sm text-destructive">
                    {forgotPasswordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setForgotPasswordOpen(false);
                  forgotPasswordForm.reset();
                }}
                disabled={forgotPasswordLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar email'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
