# Malaysia e-Invoice Helper - Technical Implementation Guide

## Project Setup & Architecture

### 1. Project Structure
```
einvoice-helper/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Cloudflare Workers API
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── database/            # Drizzle schema and migrations
│   └── validation/          # Malaysian validation rules
├── tools/
│   ├── scripts/             # Development scripts
│   └── configs/             # Shared configurations
├── docs/                    # Documentation
├── package.json             # Root package.json (workspace)
├── turbo.json              # Turborepo configuration
└── README.md
```

## Step 1: Environment Setup

### Prerequisites Installation
```bash
# Install required global tools
npm install -g wrangler          # Cloudflare Workers CLI
npm install -g @neondb/cli       # Neon database CLI
npm install -g drizzle-kit       # Database ORM and migrations
npm install -g turbo             # Monorepo tool (optional but recommended)

# Verify installations
wrangler --version
neon --version
drizzle-kit --version
```

### Initialize Project
```bash
# Create project directory
mkdir einvoice-helper
cd einvoice-helper

# Initialize as workspace
npm init -y
```

## Step 2: Database Setup (Neon PostgreSQL)

### Create Neon Database
```bash
# Login to Neon (creates account if needed)
neon auth

# Create database
neon projects create --name "einvoice-helper"

# Get connection string (save this securely)
neon connection-string
```

### Database Package Setup
```bash
# Create database package
mkdir -p packages/database
cd packages/database
npm init -y

# Install dependencies
npm install drizzle-orm drizzle-kit
npm install postgres
npm install -D @types/node typescript

# Create package.json
```

### Database Schema Implementation
Create `packages/database/src/schema.ts`:

```typescript
import { pgTable, uuid, varchar, timestamp, text, decimal, integer, boolean, jsonb, date, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  tinCheck: sql`CHECK (LENGTH(tin) >= 10)`,
}));

// Invoice templates table
export const invoiceTemplates = pgTable('invoice_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  templateData: jsonb('template_data').notNull(),
  lineTemplates: jsonb('line_templates').default([]),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Buyers table
export const buyers = pgTable('buyers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  tin: varchar('tin', { length: 20 }),
  countryCode: varchar('country_code', { length: 2 }).default('MY'),
  isIndividual: boolean('is_individual').default(false),
  address: jsonb('address'),
  contact: jsonb('contact'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgTinUnique: unique().on(table.orgId, table.tin).where(sql`tin IS NOT NULL`),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  referenceInvoiceId: uuid('reference_invoice_id').references(() => invoices.id),
  
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
  grandTotalCheck: sql`CHECK (grand_total >= 0)`,
  validationScoreCheck: sql`CHECK (validation_score >= 0 AND validation_score <= 100)`,
}));

// Invoice lines table
export const invoiceLines = pgTable('invoice_lines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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
  quantityCheck: sql`CHECK (quantity > 0)`,
  unitPriceCheck: sql`CHECK (unit_price >= 0)`,
  lineTotalCheck: sql`CHECK (line_total >= 0)`,
}));

// Validation results table
export const validationResults = pgTable('validation_results', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
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

// Export types for use in other packages
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type NewInvoiceLine = typeof invoiceLines.$inferInsert;

export type Buyer = typeof buyers.$inferSelect;
export type NewBuyer = typeof buyers.$inferInsert;

export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;
export type NewInvoiceTemplate = typeof invoiceTemplates.$inferInsert;

export type ValidationResult = typeof validationResults.$inferSelect;
export type NewValidationResult = typeof validationResults.$inferInsert;
```

### Database Configuration
Create `packages/database/drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

Create `packages/database/src/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export * from './schema';
export type Database = ReturnType<typeof createDatabase>;
```

## Step 3: Validation Package

### Create Validation Package
```bash
mkdir -p packages/validation
cd packages/validation
npm init -y

npm install zod
npm install -D typescript @types/node
```

Create `packages/validation/src/types.ts`:

```typescript
import { z } from 'zod';

// Malaysian TIN validation
export const tinSchema = z.string().refine(
  (tin) => /^[A-Z]\d{10}$|^\d{12}$/.test(tin),
  'Malaysian TIN must be format C1234567890 or 123456789012'
);

// SST rate validation
export const sstRateSchema = z.number().refine(
  (rate) => [0, 6].includes(rate),
  'SST rate must be 0% or 6%'
);

// Currency validation
export const currencySchema = z.enum(['MYR', 'USD', 'SGD', 'EUR', 'GBP']);

// Invoice type validation
export const invoiceTypeSchema = z.enum(['01', '02', '03', '04']); // invoice, credit, debit, refund

// Organization schema
export const organizationSchema = z.object({
  name: z.string().min(1).max(255),
  brn: z.string().max(20).optional(),
  tin: tinSchema,
  sstNumber: z.string().max(20).optional(),
  industryCode: z.string().max(10).optional(),
  isSstRegistered: z.boolean().default(false),
  currency: currencySchema.default('MYR'),
});

// Buyer schema
export const buyerSchema = z.object({
  name: z.string().min(1).max(255),
  tin: z.string().max(20).optional(),
  countryCode: z.string().length(2).default('MY'),
  isIndividual: z.boolean().default(false),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().default('MY'),
  }).optional(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Invoice line schema
export const invoiceLineSchema = z.object({
  lineNumber: z.number().int().positive(),
  itemDescription: z.string().min(1).max(500),
  itemSku: z.string().max(100).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  sstRate: sstRateSchema.default(0),
  taxExemptionCode: z.string().max(20).optional(),
}).refine((line) => {
  // Calculate line total
  const lineTotal = (line.quantity * line.unitPrice) - line.discountAmount;
  const sstAmount = (lineTotal * line.sstRate) / 100;
  return lineTotal >= 0;
}, 'Line total must be positive');

// Invoice schema
export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  eInvoiceType: invoiceTypeSchema.default('01'),
  issueDate: z.string().date(),
  dueDate: z.string().date().optional(),
  currency: currencySchema.default('MYR'),
  exchangeRate: z.number().positive().default(1.0),
  isConsolidated: z.boolean().default(false),
  consolidationPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  referenceInvoiceId: z.string().uuid().optional(),
  lineItems: z.array(invoiceLineSchema).min(1),
}).refine((invoice) => {
  // Validation rules
  if (invoice.eInvoiceType === '02' && !invoice.referenceInvoiceId) {
    return false; // Credit note must have reference
  }
  
  if (invoice.currency !== 'MYR' && invoice.exchangeRate === 1.0) {
    return false; // Non-MYR must have exchange rate
  }
  
  return true;
}, 'Invoice validation failed');

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type BuyerInput = z.infer<typeof buyerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
```

Create `packages/validation/src/malaysian-rules.ts`:

```typescript
import { Invoice, InvoiceLine, Organization } from '@einvoice/database';

export interface ValidationRule {
  code: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  fixHint: string;
  check: (invoice: Invoice, lines: InvoiceLine[], org: Organization) => boolean;
}

export const MALAYSIAN_VALIDATION_RULES: ValidationRule[] = [
  {
    code: 'MY-001',
    severity: 'error',
    field: 'supplier.tin',
    message: 'Malaysian TIN format invalid',
    fixHint: 'Use format C1234567890 or 123456789012',
    check: (invoice, lines, org) => {
      return /^[A-Z]\d{10}$|^\d{12}$/.test(org.tin);
    }
  },
  
  {
    code: 'MY-002',
    severity: 'error',
    field: 'line_items[].sst_amount',
    message: 'SST calculation incorrect',
    fixHint: 'SST Amount = Line Total × SST Rate ÷ 100',
    check: (invoice, lines, org) => {
      return lines.every(line => {
        const expectedSst = (parseFloat(line.lineTotal) * parseFloat(line.sstRate)) / 100;
        const actualSst = parseFloat(line.sstAmount);
        return Math.abs(actualSst - expectedSst) < 0.01;
      });
    }
  },
  
  {
    code: 'MY-003',
    severity: 'error',
    field: 'invoice.is_consolidated',
    message: 'Industry not eligible for B2C consolidation',
    fixHint: 'Issue individual invoices for utilities, telecom, government sectors',
    check: (invoice, lines, org) => {
      const prohibitedIndustries = ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'];
      return !invoice.isConsolidated || !prohibitedIndustries.includes(org.industryCode || '');
    }
  },
  
  {
    code: 'MY-004',
    severity: 'error',
    field: 'invoice.exchange_rate',
    message: 'Exchange rate required for non-MYR invoices',
    fixHint: 'Provide Bank Negara Malaysia reference rate',
    check: (invoice, lines, org) => {
      return invoice.currency === 'MYR' || parseFloat(invoice.exchangeRate) > 0;
    }
  },
  
  {
    code: 'MY-005',
    severity: 'error',
    field: 'invoice.reference_invoice_id',
    message: 'Credit note must reference original invoice',
    fixHint: 'Provide original invoice number being credited',
    check: (invoice, lines, org) => {
      return invoice.eInvoiceType !== '02' || invoice.referenceInvoiceId !== null;
    }
  }
];

export interface ValidationResult {
  ruleCode: string;
  severity: 'error' | 'warning' | 'info';
  fieldPath: string;
  message: string;
  fixSuggestion: string;
  isResolved: boolean;
}

export function validateInvoice(
  invoice: Invoice,
  lines: InvoiceLine[],
  org: Organization
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  for (const rule of MALAYSIAN_VALIDATION_RULES) {
    try {
      const isValid = rule.check(invoice, lines, org);
      
      if (!isValid) {
        results.push({
          ruleCode: rule.code,
          severity: rule.severity,
          fieldPath: rule.field,
          message: rule.message,
          fixSuggestion: rule.fixHint,
          isResolved: false,
        });
      }
    } catch (error) {
      // Log error but don't fail validation
      console.error(`Validation rule ${rule.code} failed:`, error);
    }
  }
  
  return results;
}

export function calculateValidationScore(results: ValidationResult[]): number {
  if (results.length === 0) return 100;
  
  const totalRules = MALAYSIAN_VALIDATION_RULES.length;
  const failedErrors = results.filter(r => r.severity === 'error').length;
  const failedWarnings = results.filter(r => r.severity === 'warning').length;
  
  // Errors are weighted more heavily than warnings
  const errorWeight = 10;
  const warningWeight = 3;
  
  const totalDeductions = (failedErrors * errorWeight) + (failedWarnings * warningWeight);
  const maxPossibleDeductions = totalRules * errorWeight;
  
  const score = Math.max(0, Math.round(100 - (totalDeductions / maxPossibleDeductions) * 100));
  return score;
}
```

## Step 4: API Setup (Cloudflare Workers)

### Initialize Workers Project
```bash
mkdir -p apps/api
cd apps/api

# Initialize Wrangler project
wrangler init -y

# Install dependencies
npm install hono
npm install @hono/zod-validator
npm install drizzle-orm
npm install jose  # for JWT
npm install @einvoice/database @einvoice/validation
npm install -D typescript @types/node
```

Create `apps/api/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authRoutes } from './routes/auth';
import { orgRoutes } from './routes/organizations';
import { invoiceRoutes } from './routes/invoices';
import { validationRoutes } from './routes/validation';

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Malaysia e-Invoice Helper API',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Routes
app.route('/auth', authRoutes);
app.route('/org', orgRoutes);
app.route('/invoices', invoiceRoutes);
app.route('/validation', validationRoutes);

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  }, 404);
});

export default app;
```

Create `apps/api/src/middleware/auth.ts`:

```typescript
import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { Env } from '../index';

export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  exp: number;
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authorization = c.req.header('Authorization');
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authorization.slice(7);
  
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    c.set('user', payload as JWTPayload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

Create `apps/api/src/routes/invoices.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';

import { createDatabase, invoices, invoiceLines, NewInvoice, NewInvoiceLine } from '@einvoice/database';
import { invoiceSchema } from '@einvoice/validation';
import { authMiddleware, JWTPayload } from '../middleware/auth';
import { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// List invoices
app.get('/', async (c) => {
  const user = c.get('user') as JWTPayload;
  const db = createDatabase(c.env.DATABASE_URL);
  
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  try {
    const invoiceList = await db
      .select()
      .from(invoices)
      .where(eq(invoices.orgId, user.orgId))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);
    
    return c.json({
      data: invoiceList,
      pagination: {
        page,
        limit,
        hasMore: invoiceList.length === limit
      }
    });
  } catch (error) {
    console.error('Error listing invoices:', error);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// Get single invoice
app.get('/:id', async (c) => {
  const user = c.get('user') as JWTPayload;
  const invoiceId = c.req.param('id');
  const db = createDatabase(c.env.DATABASE_URL);
  
  try {
    const invoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, user.orgId)
      ))
      .limit(1);
    
    if (invoice.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    
    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(invoiceLines.lineNumber);
    
    return c.json({
      invoice: invoice[0],
      lines
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

// Create invoice
app.post('/',
  zValidator('json', invoiceSchema),
  async (c) => {
    const user = c.get('user') as JWTPayload;
    const data = c.req.valid('json');
    const db = createDatabase(c.env.DATABASE_URL);
    
    try {
      // Calculate totals
      const subtotal = data.lineItems.reduce((sum, line) => 
        sum + (line.quantity * line.unitPrice - line.discountAmount), 0
      );
      
      const sstAmount = data.lineItems.reduce((sum, line) => {
        const lineTotal = line.quantity * line.unitPrice - line.discountAmount;
        return sum + (lineTotal * line.sstRate / 100);
      }, 0);
      
      const grandTotal = subtotal + sstAmount;
      
      // Create invoice
      const newInvoice: NewInvoice = {
        orgId: user.orgId,
        invoiceNumber: data.invoiceNumber,
        eInvoiceType: data.eInvoiceType,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        exchangeRate: data.exchangeRate.toString(),
        isConsolidated: data.isConsolidated,
        consolidationPeriod: data.consolidationPeriod,
        referenceInvoiceId: data.referenceInvoiceId,
        subtotal: subtotal.toFixed(2),
        sstAmount: sstAmount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        status: 'draft',
      };
      
      const [createdInvoice] = await db
        .insert(invoices)
        .values(newInvoice)
        .returning();
      
      // Create invoice lines
      const newLines: NewInvoiceLine[] = data.lineItems.map((line, index) => {
        const lineTotal = line.quantity * line.unitPrice - line.discountAmount;
        const lineSstAmount = lineTotal * line.sstRate / 100;
        
        return {
          invoiceId: createdInvoice.id,
          lineNumber: line.lineNumber,
          itemDescription: line.itemDescription,
          itemSku: line.itemSku,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          discountAmount: line.discountAmount.toString(),
          lineTotal: lineTotal.toFixed(2),
          sstRate: line.sstRate.toString(),
          sstAmount: lineSstAmount.toFixed(2),
          taxExemptionCode: line.taxExemptionCode,
        };
      });
      
      const createdLines = await db
        .insert(invoiceLines)
        .values(newLines)
        .returning();
      
      return c.json({
        invoice: createdInvoice,
        lines: createdLines
      }, 201);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      return c.json({ error: 'Failed to create invoice' }, 500);
    }
  }
);

export { app as invoiceRoutes };
```

## Step 5: Frontend Setup (Next.js)

### Initialize Next.js App
```bash
mkdir -p apps/web
cd apps/web

# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest . --typescript --tailwind --eslint --app

# Install additional dependencies
npm install react-hook-form @hookform/resolvers zod
npm install @headlessui/react @heroicons/react
npm install @tanstack/react-query axios
npm install @einvoice/validation @einvoice/shared
```

### Frontend API Client
Create `apps/web/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/signin';
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  sendMagicLink: (email: string) =>
    apiClient.post('/auth/magic-link', { email }),
  
  verifyToken: (token: string) =>
    apiClient.get(`/auth/verify/${token}`),
  
  // Organizations
  getOrganization: () =>
    apiClient.get('/org'),
  
  updateOrganization: (data: any) =>
    apiClient.put('/org', data),
  
  // Invoices
  getInvoices: (page = 1, limit = 20) =>
    apiClient.get(`/invoices?page=${page}&limit=${limit}`),
  
  getInvoice: (id: string) =>
    apiClient.get(`/invoices/${id}`),
  
  createInvoice: (data: any) =>
    apiClient.post('/invoices', data),
  
  updateInvoice: (id: string, data: any) =>
    apiClient.put(`/invoices/${id}`, data),
  
  deleteInvoice: (id: string) =>
    apiClient.delete(`/invoices/${id}`),
  
  // Validation
  validateInvoice: (id: string) =>
    apiClient.post(`/invoices/${id}/validate`),
  
  getValidationResults: (id: string) =>
    apiClient.get(`/invoices/${id}/validation`),
};
```

### React Query Setup
Create `apps/web/components/providers/query-provider.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Invoice Form Component
Create `apps/web/components/invoice-form.tsx`:

```typescript
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema, type InvoiceInput } from '@einvoice/validation';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceInput) => void;
  initialData?: Partial<InvoiceInput>;
  isLoading?: boolean;
}

export function InvoiceForm({ onSubmit, initialData, isLoading }: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      eInvoiceType: '01',
      currency: 'MYR',
      exchangeRate: 1.0,
      isConsolidated: false,
      lineItems: [
        {
          lineNumber: 1,
          itemDescription: '',
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
          sstRate: 6,
        },
      ],
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const watchedLines = watch('lineItems');
  const currency = watch('currency');

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.quantity * line.unitPrice) - (line.discountAmount || 0);
      return sum + lineTotal;
    }, 0);

    const sstAmount = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.quantity * line.unitPrice) - (line.discountAmount || 0);
      return sum + (lineTotal * (line.sstRate || 0) / 100);
    }, 0);

    return {
      subtotal,
      sstAmount,
      grandTotal: subtotal + sstAmount,
    };
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Invoice Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Invoice Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number
            </label>
            <input
              {...register('invoiceNumber')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="INV-2024-001"
            />
            {errors.invoiceNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Type
            </label>
            <select
              {...register('eInvoiceType')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="01">Invoice</option>
              <option value="02">Credit Note</option>
              <option value="03">Debit Note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Issue Date
            </label>
            <input
              {...register('issueDate')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.issueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.issueDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              {...register('dueDate')}
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              {...register('currency')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="MYR">MYR - Malaysian Ringgit</option>
              <option value="USD">USD - US Dollar</option>
              <option value="SGD">SGD - Singapore Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>

          {currency !== 'MYR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Exchange Rate (to MYR)
              </label>
              <input
                {...register('exchangeRate', { valueAsNumber: true })}
                type="number"
                step="0.000001"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="4.500000"
              />
              {errors.exchangeRate && (
                <p className="mt-1 text-sm text-red-600">{errors.exchangeRate.message}</p>
              )}
            </div>
          )}
        </div>

        {/* B2C Consolidation */}
        <div className="mt-6">
          <label className="flex items-center">
            <input
              {...register('isConsolidated')}
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              B2C Consolidated Invoice
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Check if this is a consolidated invoice for multiple B2C transactions
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
          <button
            type="button"
            onClick={() => append({
              lineNumber: fields.length + 1,
              itemDescription: '',
              quantity: 1,
              unitPrice: 0,
              discountAmount: 0,
              sstRate: 6,
            })}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Line
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Line {index + 1}
                </h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    {...register(`lineItems.${index}.itemDescription`)}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Item description"
                  />
                  {errors.lineItems?.[index]?.itemDescription && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.lineItems[index]?.itemDescription?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit Price ({currency})
                  </label>
                  <input
                    {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Discount ({currency})
                  </label>
                  <input
                    {...register(`lineItems.${index}.discountAmount`, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SST Rate (%)
                  </label>
                  <select
                    {...register(`lineItems.${index}.sstRate`, { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={6}>6% (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Line Total
                  </label>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {currency} {((watchedLines[index]?.quantity || 0) * (watchedLines[index]?.unitPrice || 0) - (watchedLines[index]?.discountAmount || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Totals</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium">{currency} {totals.subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">SST:</span>
            <span className="text-sm font-medium">{currency} {totals.sstAmount.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span className="text-base font-medium text-gray-900">Grand Total:</span>
              <span className="text-base font-bold text-gray-900">{currency} {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save as Draft
        </button>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}
```

### Invoice List Page
Create `apps/web/app/invoices/page.tsx`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { api } from '../../lib/api';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', page],
    queryFn: () => api.getInvoices(page, 20),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Error loading invoices</h2>
            <p className="mt-2 text-gray-600">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const invoices = data?.data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your e-Invoices and ensure Malaysian compliance
            </p>
          </div>
          
          <Link
            href="/invoices/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Invoice
          </Link>
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first invoice.</p>
            <div className="mt-6">
              <Link
                href="/invoices/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Invoice
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {invoices.map((invoice: any) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-500">
                              Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {invoice.currency} {parseFloat(invoice.grandTotal).toFixed(2)}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                invoice.status === 'draft' 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : invoice.status === 'validated'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {invoice.status}
                              </span>
                              
                              {invoice.validationScore !== null && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  invoice.validationScore >= 90
                                    ? 'bg-green-100 text-green-800'
                                    : invoice.validationScore >= 70
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {invoice.validationScore}% compliance
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {data?.data?.pagination?.hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 6: Development Scripts & Configuration

### Root Package.json (Workspace)
Create root `package.json`:

```json
{
  "name": "einvoice-helper",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:generate": "cd packages/database && drizzle-kit generate",
    "db:push": "cd packages/database && drizzle-kit push",
    "db:migrate": "cd packages/database && drizzle-kit migrate",
    "api:dev": "cd apps/api && wrangler dev",
    "api:deploy": "cd apps/api && wrangler deploy",
    "web:dev": "cd apps/web && npm run dev",
    "web:build": "cd apps/web && npm run build"
  },
  "devDependencies": {
    "turbo": "^1.10.0"
  }
}
```

### Turbo Configuration
Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Environment Configuration
Create `apps/api/.env.example`:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret-here"

# Email Service
RESEND_API_KEY="your-resend-api-key"

# Optional: Malaysian Government API keys (for future integrations)
BNM_API_KEY=""
LHDN_API_KEY=""
```

Create `apps/web/.env.local.example`:

```env
# API URL
NEXT_PUBLIC_API_URL="http://localhost:8787"

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST=""
```

### Wrangler Configuration
Create `apps/api/wrangler.toml`:

```toml
name = "einvoice-api"
main = "src/index.ts"
compatibility_date = "2024-08-16"
node_compat = true

[env.development]
vars = { ENVIRONMENT = "development" }

[env.production]
name = "einvoice-api-prod"
vars = { ENVIRONMENT = "production" }

# Configure your database URL, JWT secret, etc. in Cloudflare dashboard
# or use: wrangler secret put DATABASE_URL
# wrangler secret put JWT_SECRET
# wrangler secret put RESEND_API_KEY

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"
```

## Step 7: Getting Started Commands

### 1. Initial Setup
```bash
# Clone/create project structure
mkdir einvoice-helper && cd einvoice-helper

# Install dependencies for all packages
npm install

# Set up database
neon auth
neon projects create --name "einvoice-helper"

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Update environment files with your database URL and secrets
```

### 2. Database Setup
```bash
# Generate initial migration
npm run db:generate

# Push schema to database
npm run db:push

# Verify database connection
cd packages/database && npx drizzle-kit studio
```

### 3. Development Workflow
```bash
# Start development servers
npm run dev

# Or start individually:
npm run api:dev    # Starts Cloudflare Workers dev server on :8787
npm run web:dev    # Starts Next.js dev server on :3000

# Build for production
npm run build

# Deploy API to Cloudflare
npm run api:deploy
```

### 4. Database Operations
```bash
# Generate new migration after schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Reset database (development only)
cd packages/database && drizzle-kit drop

# Open database studio
cd packages/database && drizzle-kit studio
```

## Step 8: Testing Setup

### API Testing Setup
Create `apps/api/src/test/setup.ts`:

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createDatabase } from '@einvoice/database';

let testDb: ReturnType<typeof createDatabase>;

beforeAll(async () => {
  // Use test database
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  testDb = createDatabase(testDatabaseUrl!);
});

beforeEach(async () => {
  // Clean up database before each test
  // You might want to truncate tables or use transactions
});

afterAll(async () => {
  // Close database connections
});

export { testDb };
```

Create `apps/api/src/test/invoice.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateInvoice } from '@einvoice/validation';
import type { Invoice, InvoiceLine, Organization } from '@einvoice/database';

describe('Invoice Validation', () => {
  const mockOrg: Organization = {
    id: 'test-org',
    name: 'Test Company',
    tin: 'C1234567890',
    industryCode: '62010',
    isSstRegistered: true,
    currency: 'MYR',
    settings: {},
    brn: null,
    sstNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice: Invoice = {
    id: 'test-invoice',
    orgId: 'test-org',
    invoiceNumber: 'INV-001',
    eInvoiceType: '01',
    issueDate: '2024-08-16',
    currency: 'MYR',
    exchangeRate: '1.0',
    subtotal: '1000.00',
    sstAmount: '60.00',
    grandTotal: '1060.00',
    status: 'draft',
    validationScore: 0,
    isConsolidated: false,
    buyerId: null,
    templateId: null,
    dueDate: null,
    totalDiscount: '0.00',
    consolidationPeriod: null,
    referenceInvoiceId: null,
    lastValidatedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLines: InvoiceLine[] = [
    {
      id: 'test-line',
      invoiceId: 'test-invoice',
      lineNumber: 1,
      itemDescription: 'Test Service',
      quantity: '1',
      unitPrice: '1000.00',
      lineTotal: '1000.00',
      sstRate: '6.00',
      sstAmount: '60.00',
      itemSku: null,
      discountAmount: '0.00',
      taxExemptionCode: null,
      createdAt: new Date(),
    },
  ];

  it('should validate correct invoice', () => {
    const results = validateInvoice(mockInvoice, mockLines, mockOrg);
    expect(results).toHaveLength(0);
  });

  it('should catch TIN format errors', () => {
    const invalidOrg = { ...mockOrg, tin: 'INVALID' };
    const results = validateInvoice(mockInvoice, mockLines, invalidOrg);
    
    expect(results).toContainEqual(
      expect.objectContaining({
        ruleCode: 'MY-001',
        severity: 'error',
      })
    );
  });

  it('should catch SST calculation errors', () => {
    const invalidLines = [{
      ...mockLines[0],
      sstAmount: '100.00' // Should be 60.00
    }];
    
    const results = validateInvoice(mockInvoice, invalidLines, mockOrg);
    
    expect(results).toContainEqual(
      expect.objectContaining({
        ruleCode: 'MY-002',
        severity: 'error',
      })
    );
  });

  it('should catch consolidation restrictions', () => {
    const utilityOrg = { ...mockOrg, industryCode: '35101' }; // Electric power
    const consolidatedInvoice = { ...mockInvoice, isConsolidated: true };
    
    const results = validateInvoice(consolidatedInvoice, mockLines, utilityOrg);
    
    expect(results).toContainEqual(
      expect.objectContaining({
        ruleCode: 'MY-003',
        severity: 'error',
      })
    );
  });

  it('should require exchange rate for foreign currency', () => {
    const usdInvoice = { 
      ...mockInvoice, 
      currency: 'USD',
      exchangeRate: '1.0' // Should be > 1 for USD
    };
    
    const results = validateInvoice(usdInvoice, mockLines, mockOrg);
    
    expect(results).toContainEqual(
      expect.objectContaining({
        ruleCode: 'MY-004',
        severity: 'error',
      })
    );
  });
});
```

### Frontend Testing Setup
Create `apps/web/__tests__/invoice-form.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceForm } from '../components/invoice-form';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('InvoiceForm', () => {
  it('renders invoice form fields', () => {
    const mockOnSubmit = jest.fn();
    
    renderWithQueryClient(
      <InvoiceForm onSubmit={mockOnSubmit} />
    );
    
    expect(screen.getByLabelText(/invoice number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
    expect(screen.getByText(/line items/i)).toBeInTheDocument();
  });

  it('calculates totals correctly', async () => {
    const mockOnSubmit = jest.fn();
    
    renderWithQueryClient(
      <InvoiceForm onSubmit={mockOnSubmit} />
    );
    
    // Fill in line item
    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '2' }
    });
    
    fireEvent.change(screen.getByLabelText(/unit price/i), {
      target: { value: '100' }
    });
    
    await waitFor(() => {
      expect(screen.getByText(/MYR 200.00/)).toBeInTheDocument(); // Line total
      expect(screen.getByText(/MYR 12.00/)).toBeInTheDocument(); // SST (6%)
      expect(screen.getByText(/MYR 212.00/)).toBeInTheDocument(); // Grand total
    });
  });

  it('shows exchange rate field for non-MYR currency', async () => {
    const mockOnSubmit = jest.fn();
    
    renderWithQueryClient(
      <InvoiceForm onSubmit={mockOnSubmit} />
    );
    
    fireEvent.change(screen.getByLabelText(/currency/i), {
      target: { value: 'USD' }
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/exchange rate/i)).toBeInTheDocument();
    });
  });
});
```

## Step 9: Production Deployment Setup

### Cloudflare Workers Deployment
Create `apps/api/.github/workflows/deploy.yml`:

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths: ['apps/api/**', 'packages/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build packages
        run: npm run build --workspace=packages
      
      - name: Deploy to Cloudflare Workers
        run: npm run api:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Vercel Deployment (Frontend)
Create `apps/web/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npm run build --workspace=apps/web",
  "devCommand": "cd ../.. && npm run web:dev",
  "installCommand": "cd ../.. && npm install",
  "functions": {
    "app/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-api.your-subdomain.workers.dev"
  }
}
```

### Database Migration Script
Create `packages/database/scripts/migrate.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  
  console.log('Running migrations...');
  
  await migrate(db, { migrationsFolder: './migrations' });
  
  console.log('Migrations completed successfully');
  
  await client.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

## Step 10: Monitoring & Observability

### Error Tracking Setup
Create `apps/api/src/utils/sentry.ts`:

```typescript
import { Context } from 'hono';

export function initSentry(dsn: string) {
  // Initialize Sentry for Cloudflare Workers
  // Note: Use @sentry/cloudflare-workers package
}

export function captureException(error: Error, context?: Context) {
  console.error('API Error:', error);
  
  // Send to Sentry
  // Sentry.captureException(error, {
  //   extra: {
  //     url: context?.req.url,
  //     method: context?.req.method,
  //     headers: Object.fromEntries(context?.req.headers.entries() || []),
  //   }
  // });
}
```

### Performance Monitoring
Create `apps/api/src/middleware/metrics.ts`:

```typescript
import { Context, Next } from 'hono';

export async function metricsMiddleware(c: Context, next: Next) {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  const route = c.req.routePath;
  const method = c.req.method;
  const status = c.res.status;
  
  // Log metrics
  console.log(JSON.stringify({
    type: 'request',
    method,
    route,
    status,
    duration,
    timestamp: new Date().toISOString(),
  }));
  
  // Add performance headers
  c.res.headers.set('X-Response-Time', `${duration}ms`);
}
```

## Step 11: Documentation

### API Documentation
Create `apps/api/docs/api.md`:

```markdown
# Malaysia e-Invoice Helper API

## Authentication

All API endpoints require JWT authentication via Bearer token.

```bash
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Invoices

#### Create Invoice
```http
POST /invoices
Content-Type: application/json

{
  "invoiceNumber": "INV-2024-001",
  "eInvoiceType": "01",
  "issueDate": "2024-08-16",
  "currency": "MYR",
  "lineItems": [
    {
      "lineNumber": 1,
      "itemDescription": "Web Development Services",
      "quantity": 1,
      "unitPrice": 5000.00,
      "sstRate": 6
    }
  ]
}
```

Response:
```json
{
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-2024-001",
    "status": "draft",
    "grandTotal": "5300.00"
  },
  "lines": [...]
}
```

#### Validate Invoice
```http
POST /invoices/{id}/validate
```

Response:
```json
{
  "validationScore": 95,
  "results": [
    {
      "ruleCode": "MY-002",
      "severity": "warning",
      "message": "SST calculation should be verified",
      "fixSuggestion": "Confirm 6% SST calculation"
    }
  ]
}
```
```

### Development Guide
Create `docs/DEVELOPMENT.md`:

```markdown
# Development Guide

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd einvoice-helper
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   # Edit environment files with your values
   ```

3. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## Project Structure

- `apps/api/` - Cloudflare Workers API
- `apps/web/` - Next.js frontend
- `packages/database/` - Database schema and migrations
- `packages/validation/` - Malaysian validation rules
- `packages/shared/` - Shared utilities and types

## Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Implement changes
   - Add tests
   - Update documentation

2. **Database Changes**
   - Modify schema in `packages/database/src/schema.ts`
   - Generate migration: `npm run db:generate`
   - Apply to development: `npm run db:push`

3. **Validation Rules**
   - Add new rules to `packages/validation/src/malaysian-rules.ts`
   - Add corresponding tests
   - Update documentation

## Testing

```bash
# Run all tests
npm run test

# Run specific package tests
cd packages/validation && npm run test
cd apps/api && npm run test
```

## Deployment

- **API**: Automatically deployed via GitHub Actions to Cloudflare Workers
- **Frontend**: Deploy to Vercel with automatic deployments from `main` branch
- **Database**: Migrations run automatically on deployment
```

## Summary: Next Steps to Get Started

### Immediate Actions (Today):

1. **Set up your development environment:**
   ```bash
   mkdir einvoice-helper && cd einvoice-helper
   # Follow the project structure setup above
   ```

2. **Create accounts and services:**
   - Neon Database account (free tier)
   - Cloudflare account (free tier)
   - Resend account for emails (free tier)

3. **Initialize the basic structure:**
   ```bash
   # Create the workspace and install dependencies
   npm install
   
   # Set up database
   npm run db:generate && npm run db:push
   
   # Start development servers
   npm run dev
   ```

### Week 1 Goals:

- ✅ Complete project setup and environment configuration
- ✅ Implement basic authentication (magic link)
- ✅ Create organization setup flow
- ✅ Build basic invoice CRUD operations
- ✅ Implement core Malaysian validation rules

### Week 2 Goals:

- ✅ Add CSV import/export functionality
- ✅ Implement template system
- ✅ Build invoice form with real-time validation
- ✅ Add basic error handling and recovery

This technical implementation guide provides everything you need to start building the Malaysia e-Invoice Helper. The architecture is designed to be:

- **MVP-friendly**: Start simple, evolve complexity
- **Cost-effective**: Free tiers for initial development
- **Scalable**: Clear upgrade paths for growth
- **Compliant**: Malaysian regulatory requirements built-in

Would you like me to help you with any specific part of the implementation, or shall we dive deeper into any particular component?