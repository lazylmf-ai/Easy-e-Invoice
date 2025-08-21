import { Hono } from 'hono';
import { validateBody } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, count } from 'drizzle-orm';
import { authMiddleware, getAuthenticatedUser } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rate-limit';
import { createDatabaseFromEnv } from '@einvoice/database';
import { users, organizations, invoiceTemplates } from '@einvoice/database/schema';

const app = new Hono();

// Apply middleware
app.use('*', authMiddleware);
app.use('*', generalRateLimit);

// Template creation schema
const templateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['general', 'professional-services', 'retail', 'manufacturing', 'hospitality', 'technology']).default('general'),
  isPublic: z.boolean().default(false),
  templateData: z.object({
    // Invoice defaults
    eInvoiceType: z.enum(['01', '02', '03', '04']).default('01'),
    currency: z.enum(['MYR', 'USD', 'EUR', 'SGD']).default('MYR'),
    paymentTermsDays: z.number().int().min(0).max(365).default(30),
    
    // Default line items
    defaultLineItems: z.array(z.object({
      itemDescription: z.string(),
      quantity: z.string().default('1.000'),
      unitPrice: z.string(),
      sstRate: z.string().default('6.00'),
      category: z.string().optional(),
    })).optional(),
    
    // Business settings
    businessSettings: z.object({
      defaultNotes: z.string().optional(),
      autoCalculateSST: z.boolean().default(true),
      requirePONumber: z.boolean().default(false),
      defaultDiscountRate: z.string().default('0.00'),
    }).optional(),
    
    // Industry-specific fields
    industrySpecific: z.record(z.any()).optional(),
  }),
});

// Template update schema
const templateUpdateSchema = templateCreateSchema.partial();

// Template query schema
const templateQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  category: z.enum(['general', 'professional-services', 'retail', 'manufacturing', 'hospitality', 'technology']).optional(),
  search: z.string().optional(),
  includePublic: z.boolean().default(true),
  sortBy: z.enum(['name', 'createdAt', 'usageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Industry-specific template presets
const industryPresets = {
  'professional-services': {
    name: 'Professional Services',
    description: 'Template for consulting, legal, accounting services',
    defaultLineItems: [
      { itemDescription: 'Consultation Services', quantity: '1.000', unitPrice: '300.00', sstRate: '6.00' },
      { itemDescription: 'Document Preparation', quantity: '1.000', unitPrice: '150.00', sstRate: '6.00' },
    ],
    businessSettings: {
      defaultNotes: 'Payment due within 30 days. Late payment charges may apply.',
      autoCalculateSST: true,
      requirePONumber: true,
    }
  },
  'retail': {
    name: 'Retail Sales',
    description: 'Template for retail product sales',
    defaultLineItems: [
      { itemDescription: 'Product Sale', quantity: '1.000', unitPrice: '50.00', sstRate: '6.00' },
    ],
    businessSettings: {
      defaultNotes: 'Thank you for your purchase!',
      autoCalculateSST: true,
      requirePONumber: false,
    }
  },
  'manufacturing': {
    name: 'Manufacturing',
    description: 'Template for manufacturing and production businesses',
    defaultLineItems: [
      { itemDescription: 'Manufactured Goods', quantity: '1.000', unitPrice: '100.00', sstRate: '6.00' },
      { itemDescription: 'Assembly Services', quantity: '1.000', unitPrice: '50.00', sstRate: '6.00' },
    ],
    businessSettings: {
      defaultNotes: 'Goods manufactured to specification. Warranty terms apply.',
      autoCalculateSST: true,
      requirePONumber: true,
    }
  },
  'hospitality': {
    name: 'Hospitality',
    description: 'Template for hotels, restaurants, and hospitality services',
    defaultLineItems: [
      { itemDescription: 'Room Accommodation', quantity: '1.000', unitPrice: '200.00', sstRate: '6.00' },
      { itemDescription: 'Service Charge', quantity: '1.000', unitPrice: '20.00', sstRate: '6.00' },
    ],
    businessSettings: {
      defaultNotes: 'Thank you for choosing our services.',
      autoCalculateSST: true,
      requirePONumber: false,
    }
  },
  'technology': {
    name: 'Technology Services',
    description: 'Template for IT services and software development',
    defaultLineItems: [
      { itemDescription: 'Software Development', quantity: '1.000', unitPrice: '500.00', sstRate: '6.00' },
      { itemDescription: 'Technical Support', quantity: '1.000', unitPrice: '100.00', sstRate: '6.00' },
    ],
    businessSettings: {
      defaultNotes: 'Payment due upon completion of milestone.',
      autoCalculateSST: true,
      requirePONumber: true,
    }
  }
};

// Create new template
app.post('/',
  validateBody(templateCreateSchema),
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
 import { authMiddleware, getAuthenticatedUser } from '../middleware/auth';
import { getValidatedBody } from '../middleware/validation';
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Check if template name already exists for this organization
      const existingTemplate = await db
        .select()
        .from(invoiceTemplates)
        .where(and(
          eq(invoiceTemplates.orgId, userData[0].orgId),
          eq(invoiceTemplates.name, data.name)
        ))
        .limit(1);

      if (existingTemplate.length > 0) {
        return c.json({
          error: 'Template Exists',
          message: 'A template with this name already exists',
        }, 409);
      }

      // Create template
      const newTemplate = await db
        .insert(invoiceTemplates)
        .values({
          orgId: userData[0].orgId,
          name: data.name,
          description: data.description,
          category: data.category,
          isPublic: data.isPublic,
          templateData: data.templateData,
          version: 1,
          usageCount: 0,
        })
        .returning();

      return c.json({
        template: newTemplate[0],
        message: 'Template created successfully',
      }, 201);
    } catch (error) {
      console.error('Template creation failed:', error);
      return c.json({
        error: 'Creation Failed',
        message: 'Failed to create template',
      }, 500);
    }
  }
);

// List templates with filtering and pagination
app.get('/',
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const query = templateQuerySchema.parse(Object.fromEntries(c.req.queries()));
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Build query conditions
      const conditions = [];
      
      // Include user's organization templates and public templates
      if (query.includePublic) {
        conditions.push(
          // User's org templates OR public templates
          // Note: This is simplified - in production you'd use proper OR conditions
        );
      }

      // Add category filter
      if (query.category) {
        conditions.push(eq(invoiceTemplates.category, query.category));
      }

      // Get templates with pagination
      const offset = ((query.page || 1) - 1) * (query.limit || 20);
      
      const templates = await db
        .select({
          id: invoiceTemplates.id,
          name: invoiceTemplates.name,
          description: invoiceTemplates.description,
          category: invoiceTemplates.category,
          isPublic: invoiceTemplates.isPublic,
          version: invoiceTemplates.version,
          usageCount: invoiceTemplates.usageCount,
          createdAt: invoiceTemplates.createdAt,
          updatedAt: invoiceTemplates.updatedAt,
          isOwned: eq(invoiceTemplates.orgId, userData[0].orgId),
        })
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.orgId, userData[0].orgId)) // Simplified for demo
        .orderBy(
          query.sortOrder === 'desc' 
            ? desc(invoiceTemplates[query.sortBy || 'createdAt'])
            : invoiceTemplates[query.sortBy || 'createdAt']
        )
        .limit(query.limit || 20)
        .offset(offset);

      // Get total count
      const totalCount = await db
        .select({ count: count() })
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.orgId, userData[0].orgId));

      return c.json({
        templates,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 20,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / (query.limit || 20)),
        },
      });
    } catch (error) {
      console.error('Template listing failed:', error);
      return c.json({
        error: 'Listing Failed',
        message: 'Failed to list templates',
      }, 500);
    }
  }
);

// Get specific template by ID
app.get('/:id',
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const templateId = c.req.param('id');
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Get template (must be owned by user's org or be public)
      const template = await db
        .select()
        .from(invoiceTemplates)
        .where(and(
          eq(invoiceTemplates.id, templateId),
          // In production: OR condition for (orgId = user's org OR isPublic = true)
          eq(invoiceTemplates.orgId, userData[0].orgId)
        ))
        .limit(1);

      if (template.length === 0) {
        return c.json({
          error: 'Template Not Found',
          message: 'Template not found or access denied',
        }, 404);
      }

      return c.json({
        template: template[0],
      });
    } catch (error) {
      console.error('Template retrieval failed:', error);
      return c.json({
        error: 'Retrieval Failed',
        message: 'Failed to retrieve template',
      }, 500);
    }
  }
);

// Update template
app.put('/:id',
  validateBody(templateUpdateSchema),
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const templateId = c.req.param('id');
      const data = getValidatedBody(c);
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Check if template exists and is owned by user's organization
      const existingTemplate = await db
        .select()
        .from(invoiceTemplates)
        .where(and(
          eq(invoiceTemplates.id, templateId),
          eq(invoiceTemplates.orgId, userData[0].orgId)
        ))
        .limit(1);

      if (existingTemplate.length === 0) {
        return c.json({
          error: 'Template Not Found',
          message: 'Template not found or access denied',
        }, 404);
      }

      // Update template with version increment
      const updatedTemplate = await db
        .update(invoiceTemplates)
        .set({
          ...data,
          version: existingTemplate[0].version + 1,
          updatedAt: new Date(),
        })
        .where(eq(invoiceTemplates.id, templateId))
        .returning();

      return c.json({
        template: updatedTemplate[0],
        message: 'Template updated successfully',
      });
    } catch (error) {
      console.error('Template update failed:', error);
      return c.json({
        error: 'Update Failed',
        message: 'Failed to update template',
      }, 500);
    }
  }
);

// Delete template
app.delete('/:id',
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const templateId = c.req.param('id');
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Check if template exists and is owned by user's organization
      const existingTemplate = await db
        .select()
        .from(invoiceTemplates)
        .where(and(
          eq(invoiceTemplates.id, templateId),
          eq(invoiceTemplates.orgId, userData[0].orgId)
        ))
        .limit(1);

      if (existingTemplate.length === 0) {
        return c.json({
          error: 'Template Not Found',
          message: 'Template not found or access denied',
        }, 404);
      }

      // Delete template
      await db
        .delete(invoiceTemplates)
        .where(eq(invoiceTemplates.id, templateId));

      return c.json({
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Template deletion failed:', error);
      return c.json({
        error: 'Deletion Failed',
        message: 'Failed to delete template',
      }, 500);
    }
  }
);

// Use template (increment usage count and return template data)
app.post('/:id/use',
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const templateId = c.req.param('id');
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Get template and increment usage count
      const template = await db
        .select()
        .from(invoiceTemplates)
        .where(and(
          eq(invoiceTemplates.id, templateId),
          // In production: OR condition for (orgId = user's org OR isPublic = true)
          eq(invoiceTemplates.orgId, userData[0].orgId)
        ))
        .limit(1);

      if (template.length === 0) {
        return c.json({
          error: 'Template Not Found',
          message: 'Template not found or access denied',
        }, 404);
      }

      // Increment usage count
      await db
        .update(invoiceTemplates)
        .set({
          usageCount: template[0].usageCount + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(invoiceTemplates.id, templateId));

      return c.json({
        template: template[0],
        message: 'Template applied successfully',
      });
    } catch (error) {
      console.error('Template usage failed:', error);
      return c.json({
        error: 'Usage Failed',
        message: 'Failed to use template',
      }, 500);
    }
  }
);

// Get industry-specific template presets
app.get('/presets/industry',
  async (c) => {
    try {
      const category = c.req.query('category');
      
      if (category && industryPresets[category as keyof typeof industryPresets]) {
        return c.json({
          preset: industryPresets[category as keyof typeof industryPresets],
          category,
        });
      }

      return c.json({
        presets: Object.entries(industryPresets).map(([key, preset]) => ({
          category: key,
          ...preset,
        })),
      });
    } catch (error) {
      console.error('Preset retrieval failed:', error);
      return c.json({
        error: 'Preset Failed',
        message: 'Failed to retrieve presets',
      }, 500);
    }
  }
);

// Get template usage analytics
app.get('/analytics/usage',
  async (c) => {
    try {
      const user = getAuthenticatedUser(c);
      const env = c.env as any;
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
          message: 'User must be associated with an organization',
        }, 400);
      }

      // Get template usage statistics
      const templates = await db
        .select({
          id: invoiceTemplates.id,
          name: invoiceTemplates.name,
          category: invoiceTemplates.category,
          usageCount: invoiceTemplates.usageCount,
          lastUsedAt: invoiceTemplates.lastUsedAt,
          createdAt: invoiceTemplates.createdAt,
        })
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.orgId, userData[0].orgId))
        .orderBy(desc(invoiceTemplates.usageCount));

      // Calculate analytics
      const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
      const categoryStats = templates.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.usageCount;
        return acc;
      }, {} as Record<string, number>);

      return c.json({
        templates,
        analytics: {
          totalTemplates: templates.length,
          totalUsage,
          averageUsage: templates.length > 0 ? totalUsage / templates.length : 0,
          categoryStats,
          mostUsed: templates[0] || null,
        },
      });
    } catch (error) {
      console.error('Analytics retrieval failed:', error);
      return c.json({
        error: 'Analytics Failed',
        message: 'Failed to retrieve analytics',
      }, 500);
    }
  }
);

export { app as templateRoutes };