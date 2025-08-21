import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc, and, like, gte, lte, count } from 'drizzle-orm';
import { authMiddleware, getAuthenticatedUser } from '../middleware/auth';
import { validateBody, getValidatedBody } from '../middleware/validation';
import { generalRateLimit } from '../middleware/rate-limit';
import { createDatabaseFromEnv } from '@einvoice/database';
import { invoices, invoiceLines, organizations, users } from '@einvoice/database/schema';
import { 
  invoiceCreateSchema, 
  lineItemCreateSchema,
  validateCompleteInvoice,
  calculateValidationScore,
  type CompleteInvoice
} from '@einvoice/validation';
import { Env } from '../index';

const app = new Hono();

// Apply middleware to all invoice routes
app.use('*', authMiddleware);
app.use('*', generalRateLimit);

// Pagination schema
const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  search: z.string()
    .max(100, 'Search term too long')
    .regex(/^[a-zA-Z0-9\s\-_]*$/, 'Search contains invalid characters')
    .optional(),
  status: z.enum(['draft', 'validated', 'submitted', 'approved', 'rejected', 'cancelled']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Invoice creation schema with line items
const invoiceWithLinesSchema = z.object({
  invoice: invoiceCreateSchema,
  lineItems: z.array(lineItemCreateSchema).min(1, 'At least one line item is required'),
  buyerId: z.string().uuid().optional(),
});

// Invoice update schema
const invoiceUpdateSchema = z.object({
  invoice: invoiceCreateSchema.partial(),
  lineItems: z.array(lineItemCreateSchema.extend({
    id: z.string().uuid().optional(), // For updating existing lines
  })).optional(),
  buyerId: z.string().uuid().optional(),
});

// Get invoices list with pagination and filtering
app.get('/', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const env = c.env as Env;
    const db = createDatabaseFromEnv(env);
    
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
    
    const orgId = userData[0].orgId;
    
    // Parse query parameters
    const queryValidation = paginationSchema.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      search: c.req.query('search'),
      status: c.req.query('status'),
      dateFrom: c.req.query('dateFrom'),
      dateTo: c.req.query('dateTo'),
    });
    
    if (!queryValidation.success) {
      return c.json({
        error: 'Invalid Parameters',
        message: 'Invalid query parameters',
        details: queryValidation.error.errors,
      }, 400);
    }
    
    const { page, limit, search, status, dateFrom, dateTo } = queryValidation.data;
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(invoices.orgId, orgId)];
    
    if (status) {
      conditions.push(eq(invoices.status, status));
    }
    
    if (search) {
      // Use parameterized query to prevent SQL injection
      // The search parameter is already validated by Zod schema with regex pattern
      conditions.push(like(invoices.invoiceNumber, `%${search}%`));
    }
    
    if (dateFrom) {
      conditions.push(gte(invoices.issueDate, dateFrom));
    }
    
    if (dateTo) {
      conditions.push(lte(invoices.issueDate, dateTo));
    }
    
    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(...conditions));
    
    const total = totalResult[0].count;
    
    // Get invoices
    const invoicesList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        eInvoiceType: invoices.eInvoiceType,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        currency: invoices.currency,
        grandTotal: invoices.grandTotal,
        status: invoices.status,
        validationScore: invoices.validationScore,
        isConsolidated: invoices.isConsolidated,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);
    
    const totalPages = Math.ceil(total / limit);
    
    return c.json({
      invoices: invoicesList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        search,
        status,
        dateFrom,
        dateTo,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invoices',
    }, 500);
  }
});

// Get single invoice with line items
app.get('/:id', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const env = c.env as Env;
    const db = createDatabaseFromEnv(env);
    const invoiceId = c.req.param('id');
    
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
    
    // Get invoice
    const invoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, userData[0].orgId)
      ))
      .limit(1);
    
    if (invoice.length === 0) {
      return c.json({
        error: 'Not Found',
        message: 'Invoice not found',
      }, 404);
    }
    
    // Get line items
    const lineItems = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(invoiceLines.lineNumber);
    
    return c.json({
      invoice: invoice[0],
      lineItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invoice',
    }, 500);
  }
});

// Create new invoice
app.post('/',
  validateBody(invoiceWithLinesSchema),
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
      
      // Get organization details for validation
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
      
      // Check for duplicate invoice number
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.orgId, userData[0].orgId),
          eq(invoices.invoiceNumber, data.invoice.invoiceNumber)
        ))
        .limit(1);
      
      if (existingInvoice.length > 0) {
        return c.json({
          error: 'Duplicate Invoice Number',
          message: 'Invoice number already exists',
        }, 400);
      }
      
      // Calculate totals from line items
      const subtotal = data.lineItems.reduce((sum: number, line: any) => 
        sum + parseFloat(line.lineTotal), 0
      );
      const sstAmount = data.lineItems.reduce((sum: number, line: any) => 
        sum + parseFloat(line.sstAmount || '0'), 0
      );
      const grandTotal = subtotal - parseFloat(data.invoice.totalDiscount || '0') + sstAmount;
      
      // Validate invoice against Malaysian rules
      const completeInvoice: CompleteInvoice = {
        invoice: {
          ...data.invoice,
          subtotal: subtotal.toFixed(2),
          sstAmount: sstAmount.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
        },
        lineItems: data.lineItems,
      };
      
      const validationResults = validateCompleteInvoice(completeInvoice, {
        tin: org[0].tin,
        industryCode: org[0].industryCode,
        isSstRegistered: org[0].isSstRegistered,
      });
      
      const validationScore = calculateValidationScore(validationResults);
      
      // Create invoice and line items in a transaction
      const result = await db.transaction(async (tx) => {
        // Create invoice
        const newInvoice = await tx
          .insert(invoices)
          .values({
            orgId: userData[0].orgId,
            buyerId: data.buyerId,
            invoiceNumber: data.invoice.invoiceNumber,
            eInvoiceType: data.invoice.eInvoiceType || '01',
            issueDate: data.invoice.issueDate,
            dueDate: data.invoice.dueDate,
            currency: data.invoice.currency || 'MYR',
            exchangeRate: data.invoice.exchangeRate || '1.000000',
            subtotal: subtotal.toFixed(2),
            sstAmount: sstAmount.toFixed(2),
            totalDiscount: data.invoice.totalDiscount || '0.00',
            grandTotal: grandTotal.toFixed(2),
            isConsolidated: data.invoice.isConsolidated || false,
            consolidationPeriod: data.invoice.consolidationPeriod,
            referenceInvoiceId: data.invoice.referenceInvoiceId,
            status: data.invoice.status || 'draft',
            validationScore,
            notes: data.invoice.notes,
            internalRef: data.invoice.internalRef,
            poNumber: data.invoice.poNumber,
            metadata: data.invoice.metadata || {},
          })
          .returning();
        
        if (!newInvoice[0]) {
          throw new Error('Failed to create invoice');
        }
        
        // Create line items
        const lineItemsData = data.lineItems.map((line: any, index: number) => ({
          invoiceId: newInvoice[0].id,
          lineNumber: index + 1,
          itemDescription: line.itemDescription,
          itemSku: line.itemSku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount || '0.00',
          lineTotal: line.lineTotal,
          sstRate: line.sstRate || '0.00',
          sstAmount: line.sstAmount || '0.00',
          taxExemptionCode: line.taxExemptionCode,
        }));
        
        const newLineItems = await tx
          .insert(invoiceLines)
          .values(lineItemsData)
          .returning();
          
        if (!newLineItems || newLineItems.length === 0) {
          throw new Error('Failed to create line items');
        }
        
        return {
          invoice: newInvoice[0],
          lineItems: newLineItems,
        };
      });
      
      const { invoice: newInvoice, lineItems: newLineItems } = result;
      
      return c.json({
        message: 'Invoice created successfully',
        invoice: newInvoice,
        lineItems: newLineItems,
        validation: {
          score: validationScore,
          results: validationResults,
        },
        timestamp: new Date().toISOString(),
      }, 201);
    } catch (error) {
      console.error('Create invoice error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to create invoice',
      }, 500);
    }
  }
);

// Update invoice
app.put('/:id',
  validateBody(invoiceUpdateSchema),
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const env = c.env as Env;
      const db = createDatabaseFromEnv(env);
      const invoiceId = c.req.param('id');
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
      
      // Check if invoice exists and belongs to user's organization
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, invoiceId),
          eq(invoices.orgId, userData[0].orgId)
        ))
        .limit(1);
      
      if (existingInvoice.length === 0) {
        return c.json({
          error: 'Not Found',
          message: 'Invoice not found',
        }, 404);
      }
      
      // Check if invoice can be updated (not submitted)
      if (['submitted', 'approved'].includes(existingInvoice[0].status)) {
        return c.json({
          error: 'Cannot Update',
          message: 'Cannot update submitted or approved invoices',
        }, 400);
      }
      
      // Update invoice and line items in a transaction
      const result = await db.transaction(async (tx) => {
        // Update invoice
        const updateData: any = {};
        if (data.invoice) {
          Object.assign(updateData, data.invoice);
          updateData.updatedAt = new Date();
        }
        
        if (Object.keys(updateData).length > 0) {
          await tx
            .update(invoices)
            .set(updateData)
            .where(eq(invoices.id, invoiceId));
        }
        
        // Update line items if provided
        if (data.lineItems) {
          // Delete existing line items
          await tx
            .delete(invoiceLines)
            .where(eq(invoiceLines.invoiceId, invoiceId));
          
          // Insert new line items
          const lineItemsData = data.lineItems.map((line: any, index: number) => ({
            invoiceId,
            lineNumber: index + 1,
            itemDescription: line.itemDescription,
            itemSku: line.itemSku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: line.discountAmount || '0.00',
            lineTotal: line.lineTotal,
            sstRate: line.sstRate || '0.00',
            sstAmount: line.sstAmount || '0.00',
            taxExemptionCode: line.taxExemptionCode,
          }));
          
          const newLineItems = await tx
            .insert(invoiceLines)
            .values(lineItemsData)
            .returning();
            
          if (!newLineItems || newLineItems.length === 0) {
            throw new Error('Failed to create line items');
          }
        }
        
        // Get updated invoice with line items
        const updatedInvoice = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .limit(1);
        
        if (!updatedInvoice[0]) {
          throw new Error('Failed to retrieve updated invoice');
        }
        
        const lineItems = await tx
          .select()
          .from(invoiceLines)
          .where(eq(invoiceLines.invoiceId, invoiceId))
          .orderBy(invoiceLines.lineNumber);
          
        return {
          invoice: updatedInvoice[0],
          lineItems,
        };
      });
      
      const { invoice: updatedInvoice, lineItems } = result;
      
      return c.json({
        message: 'Invoice updated successfully',
        invoice: updatedInvoice,
        lineItems,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update invoice error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to update invoice',
      }, 500);
    }
  }
);

// Delete invoice (soft delete)
app.delete('/:id', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const env = c.env as Env;
    const db = createDatabaseFromEnv(env);
    const invoiceId = c.req.param('id');
    
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
    
    // Check if invoice exists and belongs to user's organization
    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, userData[0].orgId)
      ))
      .limit(1);
    
    if (existingInvoice.length === 0) {
      return c.json({
        error: 'Not Found',
        message: 'Invoice not found',
      }, 404);
    }
    
    // Check if invoice can be deleted
    if (['submitted', 'approved'].includes(existingInvoice[0].status)) {
      return c.json({
        error: 'Cannot Delete',
        message: 'Cannot delete submitted or approved invoices',
      }, 400);
    }
    
    // Soft delete by updating status in a transaction
    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    });
    
    return c.json({
      message: 'Invoice deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to delete invoice',
    }, 500);
  }
});

// Validate invoice against Malaysian rules
app.post('/:id/validate', async (c) => {
  try {
    const user = getAuthenticatedUser(c);
    const env = c.env as Env;
    const db = createDatabaseFromEnv(env);
    const invoiceId = c.req.param('id');
    
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
    
    // Get invoice with line items
    const invoice = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.orgId, userData[0].orgId)
      ))
      .limit(1);
    
    if (invoice.length === 0) {
      return c.json({
        error: 'Not Found',
        message: 'Invoice not found',
      }, 404);
    }
    
    const lineItems = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(invoiceLines.lineNumber);
    
    // Get organization details
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, userData[0].orgId))
      .limit(1);
    
    // Run validation
    const completeInvoice: CompleteInvoice = {
      invoice: invoice[0] as any,
      lineItems: lineItems as any,
    };
    
    const validationResults = validateCompleteInvoice(completeInvoice, {
      tin: org[0].tin,
      industryCode: org[0].industryCode,
      isSstRegistered: org[0].isSstRegistered,
    });
    
    const validationScore = calculateValidationScore(validationResults);
    
    // Update validation score in a transaction
    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({ 
          validationScore,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    });
    
    return c.json({
      validation: {
        score: validationScore,
        results: validationResults,
        isValid: validationResults.filter(r => r.severity === 'error').length === 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Validate invoice error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to validate invoice',
    }, 500);
  }
});

export { app as invoiceRoutes };