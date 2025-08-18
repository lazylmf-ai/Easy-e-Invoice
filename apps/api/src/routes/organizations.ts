import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { generalRateLimit } from '../middleware/rate-limit';
import { validateTinFormat, searchIndustryCodes } from '@einvoice/validation';
import { createDatabaseFromEnv } from '@einvoice/database';
import { users, organizations } from '@einvoice/database/schema';
import { Env } from '../index';

const app = new Hono();

// Apply auth middleware to all organization routes
app.use('*', authMiddleware);
app.use('*', generalRateLimit);

// Organization setup schema
const orgSetupSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Company name is required'),
  brn: z.string().optional(),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  
  // Tax Information
  tin: z.string().min(1, 'TIN is required'),
  industryCode: z.string().min(1, 'Industry code is required'),
  industryDescription: z.string().optional(),
  
  // SST Information
  isSstRegistered: z.boolean().default(false),
  sstNumber: z.string().optional(),
  
  // Address
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postcode: z.string().min(1, 'Postcode is required'),
    country: z.string().default('MY'),
  }),
}).refine((data) => {
  // If SST is registered, SST number is required
  if (data.isSstRegistered && !data.sstNumber) {
    return false;
  }
  return true;
}, {
  message: 'SST number is required when SST is registered',
  path: ['sstNumber'],
});

// Get organization profile
app.get('/', async (c) => {
  try {
    const user = (c as any).get('user');
    
    // TODO: Fetch organization from database
    // const db = createDatabase(c.env.DATABASE_URL);
    // const org = await db.select().from(organizations).where(eq(organizations.id, user.orgId));
    
    console.log('Fetching organization for user:', user.userId);
    
    // Mock response for now
    return c.json({
      organization: {
        id: user.orgId,
        name: 'Sample Company Sdn Bhd',
        tin: 'C1234567890',
        industryCode: '62010',
        isSstRegistered: true,
        currency: 'MYR',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get organization error:', error);
    return c.json({
      error: 'Internal Server Error',
      message: 'Failed to fetch organization',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// Update organization profile
app.put('/',
  validateBody(orgSetupSchema),
  async (c) => {
    try {
      const user = (c as any).get('user');
      const orgData = (c as any).get('validatedBody');
      
      // TODO: Update organization in database
      // const db = createDatabase(c.env.DATABASE_URL);
      // await db.update(organizations).set(orgData).where(eq(organizations.id, user.orgId));
      
      console.log('Updating organization:', user.orgId, orgData);
      
      return c.json({
        message: 'Organization updated successfully',
        organization: {
          id: user.orgId,
          ...orgData,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update organization error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to update organization',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

// Organization setup wizard (for new users)
app.post('/setup',
  validateBody(orgSetupSchema),
  async (c) => {
    try {
      const user = (c as any).get('user');
      const orgData = (c as any).get('validatedBody');
      const env = c.env as Env;
      
      // Validate TIN format
      const tinValidation = validateTinFormat(orgData.tin);
      if (!tinValidation.isValid) {
        return c.json({
          error: 'Validation Error',
          message: 'Invalid TIN format',
          details: tinValidation.errors,
        }, 400);
      }
      
      const db = createDatabaseFromEnv(env);
      
      // Check if TIN already exists
      const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.tin, orgData.tin))
        .limit(1);
      
      if (existingOrg.length > 0) {
        return c.json({
          error: 'Validation Error',
          message: 'TIN already registered with another organization',
        }, 400);
      }
      
      // Create new organization
      const newOrg = await db
        .insert(organizations)
        .values({
          name: orgData.name,
          brn: orgData.brn,
          tin: orgData.tin,
          sstNumber: orgData.sstNumber,
          industryCode: orgData.industryCode,
          isSstRegistered: orgData.isSstRegistered,
          currency: 'MYR',
          settings: {
            contactPerson: orgData.contactPerson,
            email: orgData.email,
            phone: orgData.phone,
            address: orgData.address,
            industryDescription: orgData.industryDescription,
          },
        })
        .returning();
      
      // Update user with organization ID
      await db
        .update(users)
        .set({ 
          orgId: newOrg[0].id,
          isEmailVerified: true,
        })
        .where(eq(users.id, user.userId));
      
      return c.json({
        success: true,
        message: 'Organization setup completed successfully',
        organization: {
          id: newOrg[0].id,
          name: newOrg[0].name,
          tin: newOrg[0].tin,
          industryCode: newOrg[0].industryCode,
          isSstRegistered: newOrg[0].isSstRegistered,
          currency: newOrg[0].currency,
        },
        timestamp: new Date().toISOString(),
      }, 201);
    } catch (error) {
      console.error('Organization setup error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Failed to setup organization',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

// Validate TIN endpoint
app.post('/validate-tin',
  validateBody(z.object({ tin: z.string() })),
  async (c) => {
    try {
      const { tin } = (c as any).get('validatedBody');
      
      // Use validation package to check TIN format
      const validation = validateTinFormat(tin);
      
      return c.json({
        tin,
        isValid: validation.isValid,
        type: validation.type,
        format: validation.format,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('TIN validation error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'TIN validation failed',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

// Search industry codes endpoint
app.get('/industry-codes',
  async (c) => {
    try {
      const query = c.req.query('q') || '';
      
      // Use validation package to search industry codes
      const codes = searchIndustryCodes(query);
      
      return c.json({
        query,
        results: codes.slice(0, 20), // Limit to 20 results
        total: codes.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Industry codes search error:', error);
      return c.json({
        error: 'Internal Server Error',
        message: 'Industry codes search failed',
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

export { app as organizationRoutes };