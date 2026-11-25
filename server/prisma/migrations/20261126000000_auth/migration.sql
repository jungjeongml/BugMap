-- CreateTable
CREATE TABLE "authorizations" (
    "state_hash" TEXT NOT NULL,
    "browser_hash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "app_state" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "provider_verifier" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("state_hash")
);

-- CreateTable
CREATE TABLE "app_codes" (
    "code_hash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_codes_pkey" PRIMARY KEY ("code_hash")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "display_name" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identities" (
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("provider","subject")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_hash" TEXT NOT NULL,
    "access_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spent_refresh_tokens" (
    "refresh_hash" TEXT NOT NULL,
    "session_id" UUID NOT NULL,

    CONSTRAINT "spent_refresh_tokens_pkey" PRIMARY KEY ("refresh_hash")
);

-- CreateIndex
CREATE INDEX "authorizations_expiry" ON "authorizations"("expires_at");

-- CreateIndex
CREATE INDEX "app_codes_expiry" ON "app_codes"("expires_at");

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_hash_key" ON "sessions"("refresh_hash");

-- CreateIndex
CREATE INDEX "sessions_expiry" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "spent_refresh_session" ON "spent_refresh_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spent_refresh_tokens" ADD CONSTRAINT "spent_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match SQLite NOCASE by folding only the ASCII uppercase alphabet.
CREATE UNIQUE INDEX "users_display_name"
    ON "users" (translate("display_name", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') COLLATE "C");
