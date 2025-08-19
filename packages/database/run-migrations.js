const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runMigrations() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 1
  });

  try {
    console.log('🚀 Running Easy e-Invoice database migrations...\n');
    
    // Create organizations table first (other tables depend on it)
    await sql`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(255) NOT NULL,
        "brn" varchar(20),
        "tin" varchar(20) NOT NULL,
        "sst_number" varchar(20),
        "industry_code" varchar(10),
        "is_sst_registered" boolean DEFAULT false,
        "currency" varchar(3) DEFAULT 'MYR',
        "settings" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "organizations_tin_unique" UNIQUE("tin")
      );
    `;
    console.log('✅ Created organizations table');

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar(255) NOT NULL,
        "org_id" uuid,
        "role" varchar(20) DEFAULT 'owner',
        "is_active" boolean DEFAULT true,
        "last_login_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "users_email_unique" UNIQUE("email")
      );
    `;
    console.log('✅ Created users table');

    // Create buyers table
    await sql`
      CREATE TABLE IF NOT EXISTS "buyers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "org_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "tin" varchar(20),
        "country_code" varchar(2) DEFAULT 'MY',
        "is_individual" boolean DEFAULT false,
        "address" jsonb,
        "contact" jsonb,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "buyers_org_id_tin_unique" UNIQUE("org_id","tin")
      );
    `;
    console.log('✅ Created buyers table');

    // Create invoice_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS "invoice_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "org_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "category" varchar(50) DEFAULT 'general',
        "is_public" boolean DEFAULT false,
        "template_data" jsonb NOT NULL,
        "line_templates" jsonb DEFAULT '[]'::jsonb,
        "version" integer DEFAULT 1,
        "usage_count" integer DEFAULT 0,
        "last_used_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "invoice_templates_org_id_name_unique" UNIQUE("org_id","name")
      );
    `;
    console.log('✅ Created invoice_templates table');

    // Create invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "org_id" uuid NOT NULL,
        "buyer_id" uuid,
        "template_id" uuid,
        "invoice_number" varchar(100) NOT NULL,
        "e_invoice_type" varchar(10) DEFAULT '01',
        "issue_date" date NOT NULL,
        "due_date" date,
        "currency" varchar(3) DEFAULT 'MYR',
        "exchange_rate" numeric(10, 6) DEFAULT '1.0',
        "subtotal" numeric(15, 2) NOT NULL,
        "sst_amount" numeric(15, 2) DEFAULT '0',
        "total_discount" numeric(15, 2) DEFAULT '0',
        "grand_total" numeric(15, 2) NOT NULL,
        "is_consolidated" boolean DEFAULT false,
        "consolidation_period" varchar(7),
        "reference_invoice_id" uuid,
        "status" varchar(20) DEFAULT 'draft',
        "validation_score" integer DEFAULT 0,
        "last_validated_at" timestamp,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "invoices_org_id_invoice_number_unique" UNIQUE("org_id","invoice_number")
      );
    `;
    console.log('✅ Created invoices table');

    // Create invoice_lines table
    await sql`
      CREATE TABLE IF NOT EXISTS "invoice_lines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "invoice_id" uuid NOT NULL,
        "line_number" integer NOT NULL,
        "item_description" varchar(500) NOT NULL,
        "item_sku" varchar(100),
        "quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
        "unit_price" numeric(15, 4) NOT NULL,
        "discount_amount" numeric(15, 2) DEFAULT '0',
        "line_total" numeric(15, 2) NOT NULL,
        "sst_rate" numeric(5, 2) DEFAULT '0',
        "sst_amount" numeric(15, 2) DEFAULT '0',
        "tax_exemption_code" varchar(20),
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "invoice_lines_invoice_id_line_number_unique" UNIQUE("invoice_id","line_number")
      );
    `;
    console.log('✅ Created invoice_lines table');

    // Create remaining tables
    await sql`
      CREATE TABLE IF NOT EXISTS "validation_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "invoice_id" uuid NOT NULL,
        "rule_code" varchar(20) NOT NULL,
        "severity" varchar(10) NOT NULL,
        "field_path" varchar(200),
        "message" text NOT NULL,
        "fix_suggestion" text,
        "is_resolved" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now()
      );
    `;
    console.log('✅ Created validation_results table');

    await sql`
      CREATE TABLE IF NOT EXISTS "processing_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "org_id" uuid,
        "job_type" varchar(50),
        "status" varchar(20) DEFAULT 'pending',
        "input_data" jsonb,
        "result_data" jsonb,
        "error_message" text,
        "progress_percentage" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "completed_at" timestamp
      );
    `;
    console.log('✅ Created processing_jobs table');

    await sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid,
        "org_id" uuid,
        "entity_type" varchar(50),
        "entity_id" uuid,
        "action" varchar(50),
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" timestamp DEFAULT now()
      );
    `;
    console.log('✅ Created audit_logs table');

    // Add foreign key constraints
    console.log('\n📎 Adding foreign key constraints...');
    
    await sql`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_org_id_organizations_id_fk" 
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE cascade;
    `.catch(() => console.log('   - users foreign key already exists'));

    await sql`
      ALTER TABLE "buyers" 
      ADD CONSTRAINT "buyers_org_id_organizations_id_fk" 
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE cascade;
    `.catch(() => console.log('   - buyers foreign key already exists'));

    await sql`
      ALTER TABLE "invoices" 
      ADD CONSTRAINT "invoices_org_id_organizations_id_fk" 
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE cascade;
    `.catch(() => console.log('   - invoices org_id foreign key already exists'));

    await sql`
      ALTER TABLE "invoices" 
      ADD CONSTRAINT "invoices_buyer_id_buyers_id_fk" 
      FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id");
    `.catch(() => console.log('   - invoices buyer_id foreign key already exists'));

    await sql`
      ALTER TABLE "invoice_lines" 
      ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" 
      FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade;
    `.catch(() => console.log('   - invoice_lines foreign key already exists'));

    await sql`
      ALTER TABLE "validation_results" 
      ADD CONSTRAINT "validation_results_invoice_id_invoices_id_fk" 
      FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade;
    `.catch(() => console.log('   - validation_results foreign key already exists'));

    // Add indexes
    console.log('\n🔍 Adding performance indexes...');
    
    await sql`CREATE INDEX IF NOT EXISTS "idx_audit_org_created_at" ON "audit_logs" ("org_id","created_at");`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_templates_category" ON "invoice_templates" ("category");`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_jobs_org_status" ON "processing_jobs" ("org_id","status");`;
    await sql`CREATE INDEX IF NOT EXISTS "idx_validation_invoice_severity" ON "validation_results" ("invoice_id","severity");`;
    
    console.log('✅ Added performance indexes');

    // Verify tables created
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Created ${tablesResult.length} tables:`);
    tablesResult.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    console.log('\n🇲🇾 Easy e-Invoice database ready for Malaysian SMEs!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();