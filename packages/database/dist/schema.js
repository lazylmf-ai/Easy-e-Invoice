import { pgTable, uuid, varchar, timestamp, text, decimal, integer, boolean, jsonb, date, index, unique } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
// Organizations table - Company profiles
export const organizations = pgTable('organizations', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    brn: varchar('brn', { length: 20 }),
    tin: varchar('tin', { length: 20 }).notNull(),
    sstNumber: varchar('sst_number', { length: 20 }),
    industryCode: varchar('industry_code', { length: 10 }),
    isSstRegistered: boolean('is_sst_registered').default(false),
    currency: varchar('currency', { length: 3 }).default('MYR'),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    tinUnique: unique().on(table.tin),
    tinCheck: sql `CHECK (LENGTH(tin) >= 10)`,
}));
// Invoice templates table - For reusable patterns
export const invoiceTemplates = pgTable('invoice_templates', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    templateData: jsonb('template_data').notNull(),
    lineTemplates: jsonb('line_templates').default([]),
    usageCount: integer('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});
// Buyers table - Customer database
export const buyers = pgTable('buyers', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    tin: varchar('tin', { length: 20 }),
    countryCode: varchar('country_code', { length: 2 }).default('MY'),
    isIndividual: boolean('is_individual').default(false),
    address: jsonb('address'),
    contact: jsonb('contact'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    orgTinUnique: unique().on(table.orgId, table.tin),
}));
// Invoices table - Core entity
export const invoices = pgTable('invoices', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
    buyerId: uuid('buyer_id').references(() => buyers.id),
    templateId: uuid('template_id').references(() => invoiceTemplates.id),
    // Invoice identity
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
    eInvoiceType: varchar('e_invoice_type', { length: 10 }).default('01'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date'),
    // Financial details
    currency: varchar('currency', { length: 3 }).default('MYR'),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1.0'),
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
    sstAmount: decimal('sst_amount', { precision: 15, scale: 2 }).default('0'),
    totalDiscount: decimal('total_discount', { precision: 15, scale: 2 }).default('0'),
    grandTotal: decimal('grand_total', { precision: 15, scale: 2 }).notNull(),
    // Consolidation (B2C)
    isConsolidated: boolean('is_consolidated').default(false),
    consolidationPeriod: varchar('consolidation_period', { length: 7 }),
    // References
    referenceInvoiceId: uuid('reference_invoice_id'),
    // Status & compliance
    status: varchar('status', { length: 20 }).default('draft'),
    validationScore: integer('validation_score').default(0),
    lastValidatedAt: timestamp('last_validated_at'),
    // Metadata
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    orgInvoiceNumberUnique: unique().on(table.orgId, table.invoiceNumber),
    grandTotalCheck: sql `CHECK (grand_total >= 0)`,
    validationScoreCheck: sql `CHECK (validation_score >= 0 AND validation_score <= 100)`,
}));
// Invoice line items table
export const invoiceLines = pgTable('invoice_lines', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    lineNumber: integer('line_number').notNull(),
    // Item details
    itemDescription: varchar('item_description', { length: 500 }).notNull(),
    itemSku: varchar('item_sku', { length: 100 }),
    quantity: decimal('quantity', { precision: 10, scale: 3 }).notNull().default('1'),
    unitPrice: decimal('unit_price', { precision: 15, scale: 4 }).notNull(),
    // Calculations
    discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).default('0'),
    lineTotal: decimal('line_total', { precision: 15, scale: 2 }).notNull(),
    // Tax details
    sstRate: decimal('sst_rate', { precision: 5, scale: 2 }).default('0'),
    sstAmount: decimal('sst_amount', { precision: 15, scale: 2 }).default('0'),
    taxExemptionCode: varchar('tax_exemption_code', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    invoiceLineNumberUnique: unique().on(table.invoiceId, table.lineNumber),
    quantityCheck: sql `CHECK (quantity > 0)`,
    unitPriceCheck: sql `CHECK (unit_price >= 0)`,
    lineTotalCheck: sql `CHECK (line_total >= 0)`,
}));
// Validation results table - For error tracking
export const validationResults = pgTable('validation_results', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    ruleCode: varchar('rule_code', { length: 20 }).notNull(),
    severity: varchar('severity', { length: 10 }).notNull(),
    fieldPath: varchar('field_path', { length: 200 }),
    message: text('message').notNull(),
    fixSuggestion: text('fix_suggestion'),
    isResolved: boolean('is_resolved').default(false),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    invoiceSeverityIndex: index('idx_validation_invoice_severity').on(table.invoiceId, table.severity),
}));
// Users table - For authentication
export const users = pgTable('users', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    email: varchar('email', { length: 255 }).notNull().unique(),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('owner'),
    isActive: boolean('is_active').default(true),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Audit logs table - For enhanced security (Phase 2)
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id),
    orgId: uuid('org_id').references(() => organizations.id),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    action: varchar('action', { length: 50 }),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    orgCreatedAtIndex: index('idx_audit_org_created_at').on(table.orgId, table.createdAt),
    entityIndex: index('idx_audit_entity').on(table.entityType, table.entityId),
}));
// Processing jobs table - For background processing (Phase 2)
export const processingJobs = pgTable('processing_jobs', {
    id: uuid('id').primaryKey().default(sql `gen_random_uuid()`),
    orgId: uuid('org_id').references(() => organizations.id),
    jobType: varchar('job_type', { length: 50 }),
    status: varchar('status', { length: 20 }).default('pending'),
    inputData: jsonb('input_data'),
    resultData: jsonb('result_data'),
    errorMessage: text('error_message'),
    progressPercentage: integer('progress_percentage').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
}, (table) => ({
    orgStatusIndex: index('idx_jobs_org_status').on(table.orgId, table.status),
    createdAtIndex: index('idx_jobs_created_at').on(table.createdAt),
}));
// Relations (defined after tables to avoid circular dependencies)
export const invoiceRelations = relations(invoices, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [invoices.orgId],
        references: [organizations.id],
    }),
    buyer: one(buyers, {
        fields: [invoices.buyerId],
        references: [buyers.id],
    }),
    template: one(invoiceTemplates, {
        fields: [invoices.templateId],
        references: [invoiceTemplates.id],
    }),
    referenceInvoice: one(invoices, {
        fields: [invoices.referenceInvoiceId],
        references: [invoices.id],
        relationName: 'invoiceReference',
    }),
    referencedBy: many(invoices, {
        relationName: 'invoiceReference',
    }),
    lines: many(invoiceLines),
    validationResults: many(validationResults),
}));
