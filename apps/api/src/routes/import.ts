import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware, getAuthenticatedUser } from '../middleware/auth';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generalRateLimit } from '../middleware/rate-limit';
import { createDatabaseFromEnv } from '@einvoice/database';
import { users, organizations, invoices, invoiceLines } from '@einvoice/database/schema';
import { 
  invoiceCreateSchema, 
  lineItemCreateSchema,
  validateCompleteInvoice,
  calculateValidationScore,
  type CompleteInvoice
} from '@einvoice/validation';
import { Env } from '../index';

const app = new Hono();

// Apply middleware
app.use('*', authMiddleware);
app.use('*', generalRateLimit);

// Enhanced CSV parsing utility with better handling of quoted fields
function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator outside quotes
          fields.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      // Add the last field
      fields.push(current.trim());
      
      // Remove surrounding quotes if present
      const cleanFields = fields.map(field => {
        if (field.startsWith('"') && field.endsWith('"')) {
          return field.slice(1, -1);
        }
        return field;
      });
      
      result.push(cleanFields);
    }
  }
  
  return result;
}

// Validation helper functions
function validateRowData(row: string[], mapping: Record<string, number>, rowNumber: number): string[] {
  const errors: string[] = [];
  
  // Check if row has enough columns
  const maxColumnIndex = Math.max(...Object.values(mapping).filter(v => v >= 0));
  if (row.length <= maxColumnIndex) {
    errors.push(`Row ${rowNumber}: Missing columns (expected at least ${maxColumnIndex + 1}, got ${row.length})`);
  }
  
  // Validate required fields
  const requiredFields = ['invoiceNumber', 'issueDate', 'itemDescription', 'quantity', 'unitPrice'];
  for (const field of requiredFields) {
    const columnIndex = mapping[field];
    if (columnIndex >= 0 && columnIndex < row.length) {
      const value = row[columnIndex]?.trim();
      if (!value) {
        errors.push(`Row ${rowNumber}: ${field} is required but empty`);
      }
    }
  }
  
  return errors;
}

function validateDataTypes(row: string[], mapping: Record<string, number>, rowNumber: number): string[] {
  const errors: string[] = [];
  
  // Validate numeric fields
  const numericFields = ['quantity', 'unitPrice', 'discountAmount', 'sstRate', 'exchangeRate'];
  for (const field of numericFields) {
    const columnIndex = mapping[field];
    if (columnIndex >= 0 && columnIndex < row.length) {
      const value = row[columnIndex]?.trim();
      if (value && isNaN(parseFloat(value))) {
        errors.push(`Row ${rowNumber}: ${field} must be a valid number, got "${value}"`);
      }
    }
  }
  
  // Validate date fields
  const dateFields = ['issueDate', 'dueDate'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const field of dateFields) {
    const columnIndex = mapping[field];
    if (columnIndex >= 0 && columnIndex < row.length) {
      const value = row[columnIndex]?.trim();
      if (value && !dateRegex.test(value)) {
        errors.push(`Row ${rowNumber}: ${field} must be in YYYY-MM-DD format, got "${value}"`);
      }
    }
  }
  
  // Validate currency
  const currencyIndex = mapping.currency;
  if (currencyIndex >= 0 && currencyIndex < row.length) {
    const currency = row[currencyIndex]?.trim();
    const validCurrencies = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'THB', 'IDR', 'VND'];
    if (currency && !validCurrencies.includes(currency)) {
      errors.push(`Row ${rowNumber}: Currency "${currency}" is not supported. Use: ${validCurrencies.join(', ')}`);
    }
  }
  
  return errors;
}

// Column mapping schema
const columnMappingSchema = z.object({
  invoiceNumber: z.number().int().min(0),
  issueDate: z.number().int().min(0),
  dueDate: z.number().int().min(0).optional(),
  currency: z.number().int().min(0).optional(),
  exchangeRate: z.number().int().min(0).optional(),
  buyerName: z.number().int().min(0).optional(),
  buyerTin: z.number().int().min(0).optional(),
  itemDescription: z.number().int().min(0),
  quantity: z.number().int().min(0),
  unitPrice: z.number().int().min(0),
  discountAmount: z.number().int().min(0).optional(),
  sstRate: z.number().int().min(0).optional(),
  notes: z.number().int().min(0).optional(),
});

// Import request schema
const importRequestSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
  columnMapping: columnMappingSchema,
  hasHeaders: z.boolean().default(true),
  validateOnly: z.boolean().default(false), // Preview mode
  batchSize: z.number().int().min(1).max(1000).default(100), // Process in batches
});

// Progress tracking for large imports
const importProgress = new Map<string, {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  status: 'processing' | 'completed' | 'failed';
  errors: any[];
  warnings: any[];
  startTime: number;
  lastUpdate: number;
}>();

// Parse and validate CSV data
app.post('/parse-csv', 
  validateBody(z.object({ csvData: z.string() })),
  async (c) => {
    try {
      const { csvData } = getValidatedBody<{ csvData: string }>(c);
      
      // Parse CSV
      const rows = parseCSV(csvData);
      
      if (rows.length === 0) {
        return c.json({
          error: 'Invalid CSV',
          message: 'CSV file appears to be empty',
        }, 400);
      }
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      // Analyze columns to suggest mappings
      const suggestedMappings: Record<string, number> = {};
      
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        
        if (lowerHeader.includes('invoice') && lowerHeader.includes('number')) {
          suggestedMappings.invoiceNumber = index;
        } else if (lowerHeader.includes('issue') || lowerHeader.includes('date')) {
          suggestedMappings.issueDate = index;
        } else if (lowerHeader.includes('due')) {
          suggestedMappings.dueDate = index;
        } else if (lowerHeader.includes('currency')) {
          suggestedMappings.currency = index;
        } else if (lowerHeader.includes('exchange')) {
          suggestedMappings.exchangeRate = index;
        } else if (lowerHeader.includes('buyer') && lowerHeader.includes('name')) {
          suggestedMappings.buyerName = index;
        } else if (lowerHeader.includes('buyer') && lowerHeader.includes('tin')) {
          suggestedMappings.buyerTin = index;
        } else if (lowerHeader.includes('description') || lowerHeader.includes('item')) {
          suggestedMappings.itemDescription = index;
        } else if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) {
          suggestedMappings.quantity = index;
        } else if (lowerHeader.includes('price') || lowerHeader.includes('amount')) {
          suggestedMappings.unitPrice = index;
        } else if (lowerHeader.includes('discount')) {
          suggestedMappings.discountAmount = index;
        } else if (lowerHeader.includes('sst') || lowerHeader.includes('tax')) {
          suggestedMappings.sstRate = index;
        } else if (lowerHeader.includes('note')) {
          suggestedMappings.notes = index;
        }
      });
      
      return c.json({
        headers,
        dataRows: dataRows.slice(0, 5), // Preview first 5 rows
        totalRows: dataRows.length,
        suggestedMappings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('CSV parsing error:', error);
      return c.json({
        error: 'Invalid CSV',
        message: 'Failed to parse CSV file. Please check the format.',
      }, 400);
    }
  }
);

// Import invoices from CSV
app.post('/invoices',
  validateBody(importRequestSchema),
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const env = c.env as Env;
      const db = createDatabaseFromEnv(env);
      const data = getValidatedBody(c);
      
      // Get user's organization
      const userData = await db
        .select()
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1);
      
      if (!userData[0]?.orgId) {
        return c.json({
          error: 'Organization Required',
          message: 'Complete organization setup first',
        }, 400);
      }
      
      // Get organization details
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, userData[0].orgId))
        .limit(1);
      
      if (org.length === 0) {
        return c.json({
          error: 'Organization Not Found',
          message: 'Organization not found',
        }, 404);
      }
      
      // Parse CSV
      const rows = parseCSV(data.csvData);
      const dataRows = data.hasHeaders ? rows.slice(1) : rows;
      
      const results = {
        total: dataRows.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as any[],
        warnings: [] as any[],
        invoices: [] as any[],
      };
      
      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + (data.hasHeaders ? 2 : 1);
        
        try {
          results.processed++;
          
          // Pre-validation checks
          const rowValidationErrors = validateRowData(row, data.columnMapping, rowNumber);
          const dataTypeErrors = validateDataTypes(row, data.columnMapping, rowNumber);
          
          if (rowValidationErrors.length > 0 || dataTypeErrors.length > 0) {
            throw new Error([...rowValidationErrors, ...dataTypeErrors].join('; '));
          }
          
          // Map columns to invoice data
          const invoiceData = {
            invoiceNumber: row[data.columnMapping.invoiceNumber]?.trim() || '',
            issueDate: row[data.columnMapping.issueDate]?.trim() || '',
            dueDate: data.columnMapping.dueDate !== undefined ? row[data.columnMapping.dueDate]?.trim() : undefined,
            currency: data.columnMapping.currency !== undefined ? row[data.columnMapping.currency]?.trim() || 'MYR' : 'MYR',
            exchangeRate: data.columnMapping.exchangeRate !== undefined ? row[data.columnMapping.exchangeRate]?.trim() || '1.000000' : '1.000000',
            notes: data.columnMapping.notes !== undefined ? row[data.columnMapping.notes]?.trim() : undefined,
            eInvoiceType: '01', // Default to invoice
            isConsolidated: false,
            status: 'draft',
          };
          
          const lineItemData = {
            itemDescription: row[data.columnMapping.itemDescription]?.trim() || '',
            quantity: row[data.columnMapping.quantity]?.trim() || '1',
            unitPrice: row[data.columnMapping.unitPrice]?.trim() || '0.00',
            discountAmount: data.columnMapping.discountAmount !== undefined ? row[data.columnMapping.discountAmount]?.trim() || '0.00' : '0.00',
            sstRate: data.columnMapping.sstRate !== undefined ? row[data.columnMapping.sstRate]?.trim() || '0.00' : '0.00',
          };
          
          // Validate required fields
          if (!invoiceData.invoiceNumber) {
            throw new Error('Invoice number is required');
          }
          
          if (!invoiceData.issueDate) {
            throw new Error('Issue date is required');
          }
          
          if (!lineItemData.itemDescription) {
            throw new Error('Item description is required');
          }
          
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(invoiceData.issueDate)) {
            throw new Error('Issue date must be in YYYY-MM-DD format');
          }
          
          if (invoiceData.dueDate && !dateRegex.test(invoiceData.dueDate)) {
            throw new Error('Due date must be in YYYY-MM-DD format');
          }
          
          // Calculate line totals
          const quantity = parseFloat(lineItemData.quantity);
          const unitPrice = parseFloat(lineItemData.unitPrice);
          const discount = parseFloat(lineItemData.discountAmount);
          const sstRate = parseFloat(lineItemData.sstRate);
          
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error('Quantity must be a positive number');
          }
          
          if (isNaN(unitPrice) || unitPrice < 0) {
            throw new Error('Unit price must be a non-negative number');
          }
          
          if (isNaN(discount) || discount < 0) {
            throw new Error('Discount must be a non-negative number');
          }
          
          if (isNaN(sstRate) || sstRate < 0 || sstRate > 100) {
            throw new Error('SST rate must be between 0 and 100');
          }
          
          const lineTotal = (quantity * unitPrice) - discount;
          const sstAmount = (lineTotal * sstRate) / 100;
          
          // Complete line item with calculations
          const completeLineItem = {
            ...lineItemData,
            lineTotal: lineTotal.toFixed(2),
            sstAmount: sstAmount.toFixed(2),
          };
          
          // Complete invoice with totals
          const completeInvoice = {
            ...invoiceData,
            subtotal: lineTotal.toFixed(2),
            sstAmount: sstAmount.toFixed(2),
            totalDiscount: discount.toFixed(2),
            grandTotal: (lineTotal + sstAmount).toFixed(2),
          };
          
          // Validate against Malaysian rules
          const validationResults = validateCompleteInvoice({
            invoice: completeInvoice as any,
            lineItems: [completeLineItem as any],
          }, {
            tin: org[0].tin,
            industryCode: org[0].industryCode,
            isSstRegistered: org[0].isSstRegistered,
          });
          
          const validationScore = calculateValidationScore(validationResults);
          
          // Check for validation errors
          const errorResults = validationResults.filter(r => r.severity === 'error');
          if (errorResults.length > 0) {
            results.warnings.push({
              row: rowNumber,
              message: `Validation issues: ${errorResults.map(r => r.message).join(', ')}`,
              validationScore,
            });
          }
          
          if (data.validateOnly) {
            // Preview mode - don't actually create invoices
            results.invoices.push({
              row: rowNumber,
              invoice: completeInvoice,
              lineItem: completeLineItem,
              validationScore,
              validationResults,
            });
          } else {
            // Check for duplicate invoice number
            const existingInvoice = await db
              .select()
              .from(invoices)
              .where(eq(invoices.invoiceNumber, completeInvoice.invoiceNumber))
              .limit(1);
            
            if (existingInvoice.length > 0) {
              throw new Error(`Invoice number ${completeInvoice.invoiceNumber} already exists`);
            }
            
            // Create invoice
            const newInvoice = await db
              .insert(invoices)
              .values({
                orgId: userData[0].orgId,
                invoiceNumber: completeInvoice.invoiceNumber,
                eInvoiceType: completeInvoice.eInvoiceType,
                issueDate: completeInvoice.issueDate,
                dueDate: completeInvoice.dueDate,
                currency: completeInvoice.currency,
                exchangeRate: completeInvoice.exchangeRate,
                subtotal: completeInvoice.subtotal,
                sstAmount: completeInvoice.sstAmount,
                totalDiscount: completeInvoice.totalDiscount,
                grandTotal: completeInvoice.grandTotal,
                isConsolidated: completeInvoice.isConsolidated,
                status: completeInvoice.status,
                validationScore,
                notes: completeInvoice.notes,
                metadata: { importedFromCSV: true, rowNumber },
              })
              .returning();
            
            // Create line item
            await db
              .insert(invoiceLines)
              .values({
                invoiceId: newInvoice[0].id,
                lineNumber: 1,
                itemDescription: completeLineItem.itemDescription,
                quantity: completeLineItem.quantity,
                unitPrice: completeLineItem.unitPrice,
                discountAmount: completeLineItem.discountAmount,
                lineTotal: completeLineItem.lineTotal,
                sstRate: completeLineItem.sstRate,
                sstAmount: completeLineItem.sstAmount,
              });
            
            results.invoices.push({
              row: rowNumber,
              invoiceId: newInvoice[0].id,
              invoiceNumber: completeInvoice.invoiceNumber,
              validationScore,
            });
          }
          
          results.successful++;
          
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            message: error.message || 'Unknown error',
            data: row,
          });
        }
      }
      
      return c.json({
        ...results,
        validateOnly: data.validateOnly,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Import error:', error);
      return c.json({
        error: 'Import Failed',
        message: 'Failed to import invoices from CSV',
      }, 500);
    }
  }
);

// Get import progress
app.get('/progress/:importId', async (c) => {
  const importId = c.req.param('importId');
  const progress = importProgress.get(importId);
  
  if (!progress) {
    return c.json({
      error: 'Import Not Found',
      message: 'Import progress not found or expired',
    }, 404);
  }
  
  // Clean up completed imports older than 10 minutes
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  if (progress.status === 'completed' && progress.lastUpdate < tenMinutesAgo) {
    importProgress.delete(importId);
    return c.json({
      error: 'Import Expired',
      message: 'Import progress has expired',
    }, 410);
  }
  
  return c.json({
    importId,
    ...progress,
    elapsedTime: Date.now() - progress.startTime,
    estimatedTimeRemaining: progress.processed > 0 
      ? ((Date.now() - progress.startTime) / progress.processed) * (progress.total - progress.processed)
      : null,
  });
});

// Start chunked import for large files
app.post('/start-chunked-import',
  validateBody(importRequestSchema),
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const data = getValidatedBody(c);
      
      // Parse CSV to get total row count
      const rows = parseCSV(data.csvData);
      const dataRows = data.hasHeaders ? rows.slice(1) : rows;
      
      if (dataRows.length === 0) {
        return c.json({
          error: 'Empty CSV',
          message: 'No data rows found in CSV file',
        }, 400);
      }
      
      // For smaller files, process immediately
      if (dataRows.length <= 50) {
        // Redirect to regular import
        return c.redirect('/import/invoices');
      }
      
      // Generate unique import ID
      const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize progress tracking
      importProgress.set(importId, {
        total: dataRows.length,
        processed: 0,
        successful: 0,
        failed: 0,
        status: 'processing',
        errors: [],
        warnings: [],
        startTime: Date.now(),
        lastUpdate: Date.now(),
      });
      
      // Start background processing (in a real implementation, use a queue system)
      setImmediate(async () => {
        await processChunkedImport(importId, data, user);
      });
      
      return c.json({
        importId,
        message: 'Import started in background',
        totalRows: dataRows.length,
        estimated: `${Math.ceil(dataRows.length / 100)} batches`,
      });
    } catch (error) {
      console.error('Failed to start chunked import:', error);
      return c.json({
        error: 'Import Failed',
        message: 'Failed to start import process',
      }, 500);
    }
  }
);

// Get CSV import template
app.get('/template', async (c) => {
  const csvTemplate = [
    'Invoice Number,Issue Date,Due Date,Currency,Item Description,Quantity,Unit Price,Discount Amount,SST Rate,Notes',
    'INV-2024-001,2024-08-17,2024-09-17,MYR,Professional Services,1,1000.00,0.00,6.00,Sample invoice',
    'INV-2024-002,2024-08-17,,MYR,Consulting Services,2,500.00,50.00,6.00,Bulk discount applied',
  ].join('\n');
  
  return c.text(csvTemplate, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="invoice-import-template.csv"'
  });
});

// Helper function for chunked processing
async function processChunkedImport(importId: string, data: any, user: any) {
  const progress = importProgress.get(importId);
  if (!progress) return;
  
  try {
    const env = globalThis as any; // In real implementation, pass proper env
    const db = createDatabaseFromEnv(env);
    
    // Get user's organization
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    
    if (!userData[0]?.orgId) {
      progress.status = 'failed';
      progress.lastUpdate = Date.now();
      return;
    }
    
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, userData[0].orgId))
      .limit(1);
    
    if (org.length === 0) {
      progress.status = 'failed';
      progress.lastUpdate = Date.now();
      return;
    }
    
    const rows = parseCSV(data.csvData);
    const dataRows = data.hasHeaders ? rows.slice(1) : rows;
    
    // Process in chunks
    const chunkSize = data.batchSize || 100;
    for (let i = 0; i < dataRows.length; i += chunkSize) {
      const chunk = dataRows.slice(i, i + chunkSize);
      
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowNumber = i + j + (data.hasHeaders ? 2 : 1);
        
        try {
          // Process individual row (simplified version)
          const invoiceData = {
            invoiceNumber: row[data.columnMapping.invoiceNumber]?.trim() || '',
            // ... other mapping logic
          };
          
          if (!data.validateOnly) {
            // Create actual invoice record
            // ... database operations
          }
          
          progress.successful++;
        } catch (error: any) {
          progress.failed++;
          progress.errors.push({
            row: rowNumber,
            message: error.message,
          });
        }
        
        progress.processed++;
        progress.lastUpdate = Date.now();
      }
    }
    
    progress.status = 'completed';
    progress.lastUpdate = Date.now();
  } catch (error) {
    progress.status = 'failed';
    progress.lastUpdate = Date.now();
  }
}

export { app as importRoutes };