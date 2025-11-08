-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'temp_password',
    "telefone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "google_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "status_aprovacao" TEXT NOT NULL DEFAULT 'pendente',
    "password_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "responsavel" TEXT,
    "telefone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criancas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data_nascimento" TIMESTAMP(3) NOT NULL,
    "idade" INTEGER,
    "responsavel" TEXT,
    "telefone_responsavel" TEXT,
    "responsavel2" TEXT,
    "telefone_responsavel2" TEXT,
    "responsavel3" TEXT,
    "telefone_responsavel3" TEXT,
    "endereco" TEXT,
    "escola" TEXT,
    "numero_escola" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN DEFAULT true,
    "local_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doacoes" (
    "id" TEXT NOT NULL,
    "doador" TEXT NOT NULL,
    "tipo_doacao" TEXT NOT NULL,
    "descricao" TEXT,
    "quantidade" INTEGER,
    "unidade" TEXT,
    "data_doacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "local_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "crianca_id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "sessao_id" TEXT,
    "data_checkin" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "doacao_id" TEXT,
    "quantidade_consumida" INTEGER,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaborador_locais" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colaborador_locais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doacao_destinatarios" (
    "id" TEXT NOT NULL,
    "doacao_id" TEXT NOT NULL,
    "crianca_id" TEXT NOT NULL,
    "entregue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doacao_destinatarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "record_id" TEXT,
    "user_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" JSONB,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags_saude" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crianca_saude" (
    "id" TEXT NOT NULL,
    "crianca_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crianca_saude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_google_id_key" ON "profiles"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "colaborador_locais_colaborador_id_local_id_key" ON "colaborador_locais"("colaborador_id", "local_id");

-- CreateIndex
CREATE UNIQUE INDEX "doacao_destinatarios_doacao_id_crianca_id_key" ON "doacao_destinatarios"("doacao_id", "crianca_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_saude_nome_key" ON "tags_saude"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "crianca_saude_crianca_id_tag_id_key" ON "crianca_saude"("crianca_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "criancas" ADD CONSTRAINT "criancas_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacoes" ADD CONSTRAINT "doacoes_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_crianca_id_fkey" FOREIGN KEY ("crianca_id") REFERENCES "criancas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_doacao_id_fkey" FOREIGN KEY ("doacao_id") REFERENCES "doacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaborador_locais" ADD CONSTRAINT "colaborador_locais_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaborador_locais" ADD CONSTRAINT "colaborador_locais_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao_destinatarios" ADD CONSTRAINT "doacao_destinatarios_doacao_id_fkey" FOREIGN KEY ("doacao_id") REFERENCES "doacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao_destinatarios" ADD CONSTRAINT "doacao_destinatarios_crianca_id_fkey" FOREIGN KEY ("crianca_id") REFERENCES "criancas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crianca_saude" ADD CONSTRAINT "crianca_saude_crianca_id_fkey" FOREIGN KEY ("crianca_id") REFERENCES "criancas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crianca_saude" ADD CONSTRAINT "crianca_saude_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags_saude"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
