import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { generalRateLimit } from '../middleware/rate-limit';
import { tinSchema, organizationSchema } from '@einvoice/validation';
import { Env } from '../index';

const app = new Hono();

// Apply auth middleware to all organization routes
app.use('*', authMiddleware);
app.use('*', generalRateLimit);

// Organization setup schema
const orgSetupSchema = organizationSchema.extend({
  contactPerson: z.string().min(1, 'Contact person is required'),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postcode: z.string().min(1, 'Postcode is required'),
    country: z.string().default('MY'),
  }),
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
      
      // TODO: Create new organization in database
      // const db = createDatabase(c.env.DATABASE_URL);
      // const newOrg = await db.insert(organizations).values(orgData).returning();
      
      console.log('Setting up new organization for user:', user.userId, orgData);
      
      return c.json({
        message: 'Organization setup completed successfully',
        organization: {
          id: 'new-org-id',
          ...orgData,
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
      const isValid = tinSchema.safeParse(tin).success;
      
      return c.json({
        tin,
        isValid,
        format: isValid ? (tin.match(/^[A-Z]/) ? 'Corporate' : 'Individual') : 'Invalid',
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

export { app as organizationRoutes };