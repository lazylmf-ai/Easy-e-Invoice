ALTER TABLE "invoices" DROP CONSTRAINT "invoices_reference_invoice_id_invoices_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "category" varchar(50) DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_templates_category" ON "invoice_templates" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_templates_usage" ON "invoice_templates" ("usage_count");--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_org_id_name_unique" UNIQUE("org_id","name");