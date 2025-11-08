# Documentação de Arquivos Auxiliares e Legado

Este documento cataloga arquivos e diretórios no projeto que não são parte do código-fonte principal da aplicação em produção. Eles servem para tarefas de desenvolvimento, manutenção, teste ou são artefatos legados.

## 1. Scripts de Manutenção e Seed

**Localização:** `backend/scripts/`

Este diretório contém scripts para preparar e manter o banco de dados durante o desenvolvimento e teste. **Nenhum desses scripts deve ser executado em um ambiente de produção sem conhecimento prévio e backups.**

### `limpar-dados.js`

- **Propósito:** Script Node.js que remove todos os registros das tabelas `Checkin`, `DoacaoDestinatario` e `Doacao`.
- **Uso:** Ideal para resetar o estado do banco de dados em um ambiente de desenvolvimento antes de executar um novo teste ou popular com novos dados.
- **Execução:** `node backend/scripts/limpar-dados.js`

### `limpar-doacoes-checkins.sql`

- **Propósito:** Script SQL que executa a mesma função do `limpar-dados.js`, mas diretamente no banco de dados.
- **Uso:** Alternativa ao script Node.js, útil para ser executado em uma ferramenta de gerenciamento de banco de dados.

### `seed-admin.js`

- **Propósito:** Cria um usuário com perfil de `admin` no banco de dados, com credenciais pré-definidas no próprio arquivo.
- **Uso:** Essencial para a configuração inicial do sistema, permitindo o primeiro login para gerenciar a aplicação.
- **Segurança:** As credenciais estão hardcoded e visíveis no console durante a execução. **É crucial alterar a senha após o primeiro login.**

### `seed-teste.js`

- **Propósito:** Popula o banco de dados com um conjunto de dados de teste consistentes, incluindo doações e check-ins vinculados.
- **Uso:** Garante que o ambiente de desenvolvimento tenha dados realistas para testar funcionalidades como o cálculo de estoque, relatórios e a interface de check-in.
- **Execução:** `node backend/scripts/seed-teste.js`

### `README.md`

- **Propósito:** Fornece instruções detalhadas sobre como e quando usar os scripts contidos neste diretório, incluindo a ordem recomendada de execução.

---

## 2. Artefatos de Migração

### `backend/migration_preview.sql`

- **Propósito:** Este arquivo é um artefato gerado por uma ferramenta de migração de banco de dados (provavelmente Prisma). Ele contém o SQL que seria executado para aplicar as mudanças do schema.
- **Status:** É um arquivo de visualização e não é utilizado diretamente pela aplicação. Pode ser ignorado ou deletado com segurança, pois será gerado novamente se necessário.

---

## 3. Ícones e Assets

### `novos icones/`

- **Propósito:** Este diretório parece conter versões mais recentes ou alternativas dos ícones da aplicação (PWA e favicon).
- **Status:** Atualmente, estes ícones não estão sendo usados. A aplicação utiliza os ícones localizados em `create-your-wonder-05/public/`. Este diretório pode ser um backup, um local de trabalho para novos designs ou material legado.
