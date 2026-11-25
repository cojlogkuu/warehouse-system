-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'MANAGER', 'STOREKEEPER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "counterparty_type" AS ENUM ('SUPPLIER', 'CUSTOMER', 'BOTH');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('RECEIPT', 'SHIPMENT', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "write_off_reason" AS ENUM ('DAMAGED', 'EXPIRED', 'LOST', 'SHORTAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('RECEIPT', 'SHIPMENT', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "valuation_method" AS ENUM ('FIFO', 'WEIGHTED_AVERAGE', 'LAST_PURCHASE_PRICE');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('LOW_STOCK');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparties" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "counterparty_type" NOT NULL,
    "tax_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "supplier_id" UUID,
    "price" DECIMAL(14,2) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_documents" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "type" "document_type" NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'DRAFT',
    "document_date" DATE NOT NULL,
    "counterparty_id" UUID,
    "write_off_reason" "write_off_reason",
    "comment" TEXT,
    "created_by_id" UUID NOT NULL,
    "posted_by_id" UUID,
    "posted_at" TIMESTAMPTZ(3),
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_lines" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2),

    CONSTRAINT "document_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_line_id" UUID NOT NULL,
    "type" "movement_type" NOT NULL,
    "quantity_delta" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,2),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "reversal_of_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'ACTIVE',
    "product_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "quantity_at_alert" DECIMAL(14,3) NOT NULL,
    "min_stock_level" DECIMAL(14,3) NOT NULL,
    "acknowledged_by_id" UUID,
    "acknowledged_at" TIMESTAMPTZ(3),
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" TEXT NOT NULL,
    "company_address" TEXT NOT NULL,
    "default_valuation_method" "valuation_method" NOT NULL DEFAULT 'FIFO',
    "low_stock_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_counters" (
    "type" "document_type" NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("type","year")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "counterparties_tax_id_key" ON "counterparties"("tax_id");

-- CreateIndex
CREATE INDEX "counterparties_type_idx" ON "counterparties"("type");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_unit_id_idx" ON "products"("unit_id");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "products"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_documents_number_key" ON "stock_documents"("number");

-- CreateIndex
CREATE INDEX "stock_documents_type_status_document_date_idx" ON "stock_documents"("type", "status", "document_date");

-- CreateIndex
CREATE INDEX "stock_documents_document_date_idx" ON "stock_documents"("document_date");

-- CreateIndex
CREATE INDEX "stock_documents_counterparty_id_idx" ON "stock_documents"("counterparty_id");

-- CreateIndex
CREATE INDEX "document_lines_product_id_idx" ON "document_lines"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_lines_document_id_line_no_key" ON "document_lines"("document_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_reversal_of_id_key" ON "stock_movements"("reversal_of_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_occurred_at_id_idx" ON "stock_movements"("product_id", "occurred_at", "id");

-- CreateIndex
CREATE INDEX "stock_movements_occurred_at_idx" ON "stock_movements"("occurred_at");

-- CreateIndex
CREATE INDEX "stock_movements_document_id_idx" ON "stock_movements"("document_id");

-- CreateIndex
CREATE INDEX "stock_movements_document_line_id_idx" ON "stock_movements"("document_line_id");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_product_id_idx" ON "notifications"("product_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_lines" ADD CONSTRAINT "document_lines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "stock_documents"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_lines" ADD CONSTRAINT "document_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "stock_documents"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_document_line_id_fkey" FOREIGN KEY ("document_line_id") REFERENCES "document_lines"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- Integrity rules that the Prisma schema cannot express
-- ---------------------------------------------------------------------------

-- E-mail addresses are stored in lower case, so the unique index is case-insensitive
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_lower_case_check" CHECK ("email" = lower("email"));

-- Stock can never become negative
ALTER TABLE "products"
    ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0),
    ADD CONSTRAINT "products_quantity_check" CHECK ("quantity" >= 0),
    ADD CONSTRAINT "products_min_stock_level_check" CHECK ("min_stock_level" >= 0);

-- Document type decides which header fields are allowed; drafts may be incomplete
ALTER TABLE "stock_documents"
    ADD CONSTRAINT "stock_documents_header_allowed_check" CHECK (
        CASE WHEN "type" = 'WRITE_OFF' THEN "counterparty_id" IS NULL ELSE "write_off_reason" IS NULL END
    ),
    ADD CONSTRAINT "stock_documents_header_complete_check" CHECK (
        "status" = 'DRAFT'
        OR CASE WHEN "type" = 'WRITE_OFF' THEN "write_off_reason" IS NOT NULL ELSE "counterparty_id" IS NOT NULL END
    ),
    ADD CONSTRAINT "stock_documents_posted_fields_check" CHECK (
        ("posted_by_id" IS NOT NULL) = ("status" <> 'DRAFT')
        AND ("posted_at" IS NOT NULL) = ("status" <> 'DRAFT')
    ),
    ADD CONSTRAINT "stock_documents_cancelled_fields_check" CHECK (
        ("cancelled_by_id" IS NOT NULL) = ("status" = 'CANCELLED')
        AND ("cancelled_at" IS NOT NULL) = ("status" = 'CANCELLED')
    );

ALTER TABLE "document_lines"
    ADD CONSTRAINT "document_lines_line_no_check" CHECK ("line_no" > 0),
    ADD CONSTRAINT "document_lines_quantity_check" CHECK ("quantity" > 0),
    ADD CONSTRAINT "document_lines_unit_price_check" CHECK ("unit_price" >= 0);

-- Receipts and reversed issues increase stock, issues and reversed receipts decrease it
ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_quantity_delta_check" CHECK (
        "quantity_delta" <> 0
        AND ("quantity_delta" > 0) = (("type" = 'RECEIPT') = ("reversal_of_id" IS NULL))
    ),
    ADD CONSTRAINT "stock_movements_unit_cost_check" CHECK (
        "unit_cost" >= 0 AND ("type" <> 'RECEIPT' OR "unit_cost" IS NOT NULL)
    ),
    ADD CONSTRAINT "stock_movements_not_self_reversal_check" CHECK ("reversal_of_id" <> "id");

-- A document line has at most one original movement and at most one reversal
CREATE UNIQUE INDEX "stock_movements_line_original_key"
    ON "stock_movements" ("document_line_id") WHERE "reversal_of_id" IS NULL;
CREATE UNIQUE INDEX "stock_movements_line_reversal_key"
    ON "stock_movements" ("document_line_id") WHERE "reversal_of_id" IS NOT NULL;

-- The ledger is append-only
CREATE FUNCTION "reject_stock_movement_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'stock_movements is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "stock_movements_no_update_or_delete"
    BEFORE UPDATE OR DELETE ON "stock_movements"
    FOR EACH ROW EXECUTE FUNCTION "reject_stock_movement_change"();

CREATE TRIGGER "stock_movements_no_truncate"
    BEFORE TRUNCATE ON "stock_movements"
    FOR EACH STATEMENT EXECUTE FUNCTION "reject_stock_movement_change"();

-- At most one open notification per product
CREATE UNIQUE INDEX "notifications_open_product_key"
    ON "notifications" ("product_id") WHERE "status" IN ('ACTIVE', 'ACKNOWLEDGED');

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_acknowledged_fields_check" CHECK (
        ("acknowledged_by_id" IS NULL) = ("acknowledged_at" IS NULL)
        AND ("status" <> 'ACTIVE' OR "acknowledged_at" IS NULL)
        AND ("status" <> 'ACKNOWLEDGED' OR "acknowledged_at" IS NOT NULL)
    ),
    ADD CONSTRAINT "notifications_resolved_at_check" CHECK (
        ("status" = 'RESOLVED') = ("resolved_at" IS NOT NULL)
    );

-- Exactly one settings row is possible
ALTER TABLE "system_settings"
    ADD CONSTRAINT "system_settings_single_row_check" CHECK ("id" = 1);

ALTER TABLE "document_counters"
    ADD CONSTRAINT "document_counters_year_check" CHECK ("year" BETWEEN 2000 AND 9999),
    ADD CONSTRAINT "document_counters_last_value_check" CHECK ("last_value" >= 0);
