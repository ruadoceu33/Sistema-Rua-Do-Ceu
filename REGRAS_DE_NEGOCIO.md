# 📜 Regras de Negócio - Projeto Rua do Céu

## 1. Gestão de Usuários e Acesso

### 1.1. Papéis de Usuário
- **Admin**: Acesso total ao sistema. Pode gerenciar colaboradores, locais, crianças, doações e visualizar todos os relatórios e logs de auditoria.
- **Colaborador (user)**: Acesso restrito. Pode gerenciar crianças, check-ins e doações, mas não pode gerenciar outros colaboradores ou locais.

### 1.2. Processo de Cadastro e Aprovação
1.  **Cadastro**: Um novo colaborador pode se cadastrar via formulário de registro ou através do login com Google.
2.  **Status Inicial**: Ao se cadastrar, o usuário é criado com `role: 'user'`, `status_aprovacao: 'pendente'` e `ativo: false`.
3.  **Aprovação**: Um `Admin` deve aprovar o novo colaborador. Durante a aprovação, o `Admin` deve associar o colaborador a um ou mais **locais** de trabalho.
4.  **Ativação**: Após a aprovação, o status do colaborador muda para `status_aprovacao: 'aprovado'` e `ativo: true`.
5.  **Login**: O colaborador só pode fazer login no sistema após ser aprovado.

### 1.3. Autenticação
- **Email/Senha**: Apenas usuários `Admin` podem se autenticar via email e senha.
- **Google OAuth 2.0**: Colaboradores (`user`) devem se autenticar via Google. Se um `Admin` usar o login com Google, o sistema associará o `google_id` à sua conta existente.
- **Contas Novas via Google**: Se um email do Google não existe no sistema, uma nova conta de colaborador é criada com status `pendente`.

### 1.4. Recuperação de Senha
1.  **Solicitação**: Um usuário pode solicitar a recuperação de senha informando seu email. O sistema sempre retorna uma mensagem de sucesso para não revelar se um email está ou não cadastrado.
2.  **Token**: Um token de uso único é gerado, armazenado na tabela `PasswordResetToken` com validade de **1 hora**.
3.  **Redefinição**: O usuário usa o link enviado por email para definir uma nova senha.
4.  **Invalidação de Sessões**: Ao redefinir a senha, o campo `password_version` do usuário é incrementado. Todos os `access_token` e `refresh_token` emitidos anteriormente para aquele usuário se tornam inválidos, forçando um novo login em todos os dispositivos.

### 1.5. Permissões de Acesso
| Operação | Admin | Colaborador |
|---|---|---|
| Gerenciar Colaboradores (CRUD) | ✅ | ❌ |
| Aprovar Colaboradores | ✅ | ❌ |
| Gerenciar Locais (CRUD) | ✅ | ❌ |
| Gerenciar Crianças (CRUD) | ✅ | ✅ |
| Deletar Crianças | ✅ | ❌ |
| Gerenciar Doações (CRUD) | ✅ | ✅ |
| Deletar Doações | ✅ | ❌ |
| Gerenciar Check-ins | ✅ | ✅ |
| Gerenciar Tags de Saúde | ✅ | ✅ |
| Visualizar Relatórios | ✅ | ✅ |
| Visualizar Logs de Auditoria | ✅ | ❌ |

---

## 2. Gestão de Crianças

### 2.1. Cadastro e Exclusão
- **Cálculo de Idade**: A idade da criança é calculada e armazenada no banco de dados no momento do cadastro e atualizada na edição.
- **Exclusão**: Uma criança não pode ser excluída se possuir registros de `check-ins` associados a ela.

### 2.2. Vínculo com Locais
- Uma criança pode ser associada a apenas um `local` de atendimento.

### 2.3. Tags de Saúde
- Tags de saúde (ex: "Alergia a Leite") podem ser criadas e associadas a múltiplas crianças.
- Uma tag não pode ser excluída se estiver associada a pelo menos uma criança.

---

## 3. Gestão de Doações e Check-ins

### 3.1. Controle de Estoque de Doações
- **Entrada**: O campo `quantidade` em uma doação representa o estoque inicial.
- **Saída**: A cada `check-in` associado a uma doação, a `quantidade_consumida` é subtraída do estoque. Por padrão, cada criança consome `1` unidade da doação se não for especificado.
- **Validação**: O sistema impede a realização de um `check-in` com doação se o estoque (`quantidade_restante`) for insuficiente.

### 3.2. Check-in em Massa (`/checkins/bulk`)
- Permite registrar a presença ou ausência de várias crianças de uma vez.
- Todos os check-ins de uma operação em massa recebem o mesmo `sessao_id` para agrupamento.
- O sistema valida o estoque total necessário para todos os presentes antes de confirmar a operação.

### 3.3. Doações de Aniversário
- Uma doação do tipo `Presente de Aniversário` deve, obrigatoriamente, ter uma ou mais `crianças_destinatarias`.
- A quantidade de presentes deve ser igual ou superior ao número de crianças destinatárias.
- A entrega de um presente é registrada através de um endpoint específico (`/doacoes/:id/marcar-entregue`) que atualiza o status na tabela `DoacaoDestinatario`.

### 3.4. Exclusão de Doações e Locais
- Uma `doação` não pode ser excluída se tiver `check-ins` associados.
- Um `local` não pode ser excluído se tiver `crianças` ou `check-ins` associados.

---

## 4. Lógica de Relatórios

### 4.1. Ranking de Urgência (`/relatorios/ranking-urgencia`)
- Classifica as crianças ativas com base no tempo decorrido desde o último `check-in` (ou desde a data de cadastro, se nunca houve um).
- A urgência é categorizada por cores com base no número de dias sem receber doação:
  - **Verde**: 0-30 dias
  - **Amarelo**: 31-90 dias
  - **Laranja**: 91-180 dias
  - **Vermelho**: > 180 dias

### 4.2. Taxa de Cobertura (`/relatorios/taxa-cobertura`)
- Calcula a porcentagem de crianças ativas em um local que receberam pelo menos uma doação em um determinado período.
- Fórmula: `(crianças_atendidas / total_de_crianças_matriculadas_no_local) * 100`

### 4.3. Histórico da Criança (`/criancas/:id/historico-doacoes`)
- Consolida todos os `check-ins` onde a criança recebeu uma doação e todos os `presentes de aniversário` recebidos.

---

## 5. Auditoria

- Todas as operações de criação (`INSERT`), atualização (`UPDATE`) e exclusão (`DELETE`) nas tabelas principais (`profiles`, `criancas`, `doacoes`, etc.) são registradas na tabela `audit_logs`.
- O log armazena o usuário responsável, a operação, a tabela, o ID do registro, e os valores antigos e novos (para updates).
