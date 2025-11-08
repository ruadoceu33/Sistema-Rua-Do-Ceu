import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '@/lib/api';

const resetPasswordSchema = z.object({
  novaSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type PageState = 'validating' | 'valid' | 'invalid' | 'success';

export default function ResetarSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pageState, setPageState] = useState<PageState>('validating');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  useEffect(() => {
    const validarToken = async () => {
      if (!token) {
        setPageState('invalid');
        setErrorMessage('Token de recuperação não encontrado. Verifique o link no email.');
        return;
      }

      try {
        const result = await apiClient.validarTokenReset(token);
        if (result.valid) {
          setPageState('valid');
        } else {
          setPageState('invalid');
          setErrorMessage('Link expirado ou inválido. Solicite um novo link de recuperação.');
        }
      } catch (error: any) {
        setPageState('invalid');
        const errorMsg = error.response?.data?.error?.message || 'Erro ao validar token. O link pode ter expirado.';
        setErrorMessage(errorMsg);
      }
    };

    validarToken();
  }, [token]);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setLoading(true);
    try {
      await apiClient.resetarSenha({
        token,
        novaSenha: data.novaSenha
      });

      setPageState('success');
      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || 'Erro ao redefinir senha. Tente novamente.';
      toast({
        title: "Erro ao redefinir senha",
        description: errorMsg,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            {pageState === 'validating' && 'Validando link de recuperação...'}
            {pageState === 'valid' && 'Digite sua nova senha'}
            {pageState === 'invalid' && 'Link inválido ou expirado'}
            {pageState === 'success' && 'Senha redefinida com sucesso!'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {pageState === 'validating' && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Validando link de recuperação...
              </p>
            </div>
          )}

          {pageState === 'valid' && (
            <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('novaSenha')}
                />
                {form.formState.errors.novaSenha && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.novaSenha.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('confirmarSenha')}
                />
                {form.formState.errors.confirmarSenha && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmarSenha.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          )}

          {pageState === 'invalid' && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <XCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive font-medium">
                  Link inválido ou expirado
                </p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full sm:w-auto">
                Voltar para o login
              </Button>
            </div>
          )}

          {pageState === 'success' && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sua senha foi redefinida com sucesso!
                </p>
                <p className="text-sm text-muted-foreground">
                  Agora você pode fazer login com sua nova senha.
                </p>
              </div>
              <Button onClick={handleGoToLogin} className="w-full sm:w-auto">
                Ir para o login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
