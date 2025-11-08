// Importa o hook useNavigate da biblioteca react-router-dom para permitir a navegação programática.
import { useNavigate } from 'react-router-dom';
// Importa componentes de UI (Button, Card) que ajudam a construir a interface de forma consistente.
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Importa ícones da biblioteca lucide-react para melhorar a usabilidade e o design visual.
import { Clock, ArrowLeft } from 'lucide-react';

/**
 * Componente AguardandoAprovacao
 * 
 * Esta página é exibida para usuários que se registraram com sucesso, mas cujas contas
 * ainda não foram aprovadas por um administrador. Ela informa o status e os próximos passos.
 */
export default function AguardandoAprovacao() {
  // O hook useNavigate retorna uma função que permite navegar para outras rotas da aplicação.
  // É a maneira padrão de mudar de página em resposta a eventos, como cliques de botão.
  const navigate = useNavigate();

  // A função return define a estrutura JSX (JavaScript XML) que será renderizada no navegador.
  // O JSX parece HTML, mas permite incorporar lógica JavaScript diretamente.
  return (
    // Container principal que centraliza o conteúdo na tela, com um fundo gradiente.
    // As classes de estilização (className) são do TailwindCSS, um framework CSS "utility-first".
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      {/* O componente Card agrupa o conteúdo em um layout visualmente distinto. */}
      <Card className="w-full max-w-full sm:max-w-md">
        {/* Cabeçalho do card, contendo o ícone, título e descrição. */}
        <CardHeader className="text-center space-y-4">
          {/* Ícone de relógio para representar o estado de "aguardando". */}
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          {/* Título principal da página. */}
          <CardTitle className="text-2xl sm:text-3xl">Aguardando Aprovação</CardTitle>
          {/* Descrição que confirma a criação da conta. */}
          <CardDescription className="text-base sm:text-lg">
            Sua conta foi criada com sucesso!
          </CardDescription>
        </CardHeader>
        {/* Conteúdo principal do card, com mais detalhes e ações. */}
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Caixa de informação destacada para explicar o motivo da espera. */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm sm:text-base text-blue-900">
              Um administrador está analisando sua solicitação de acesso ao sistema.
              Você será notificado quando sua conta for aprovada.
            </p>
          </div>

          {/* Seção que lista os próximos passos para o usuário. */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Próximos passos:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm sm:text-base text-gray-600">
              <li>Aguarde a aprovação do administrador</li>
              <li>Você receberá acesso em breve</li>
              <li>Após aprovação, faça login novamente com o Google</li>
            </ol>
          </div>

          {/* Botão para retornar à página de login. */}
          <Button
            // O evento onClick chama a função navigate para redirecionar o usuário para a rota '/auth'.
            onClick={() => navigate('/auth')}
            variant="outline" // Estilo do botão.
            className="w-full sm:w-auto sm:mx-auto sm:flex" // Classes de layout e responsividade.
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {/* Ícone de seta para a esquerda. */}
            Voltar ao Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
