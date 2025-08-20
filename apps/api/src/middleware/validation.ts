import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';

// Enhanced context interface for validated data
export interface ValidatedContext<T = any> extends Context {
  get(key: 'validatedBody'): T;
  get(key: 'validatedQuery'): T;
  get(key: 'validatedParams'): T;
  get(key: string): any;
}

// Utility function to safely get validated body
export function getValidatedBody<T>(c: Context): T {
  const validatedBody = c.get('validatedBody');
  if (!validatedBody) {
    throw new Error('No validated body found. Ensure validateBody middleware is applied.');
  }
  return validatedBody as T;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);
      c.set('validatedBody', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation Error',
          message: 'Request body validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        }, 400);
      }
      
      return c.json({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
        timestamp: new Date().toISOString(),
      }, 400);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validatedData = schema.parse(query);
      c.set('validatedQuery', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation Error',
          message: 'Query parameters validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        }, 400);
      }
      
      return c.json({
        error: 'Invalid Query Parameters',
        message: 'Query parameters validation failed',
        timestamp: new Date().toISOString(),
      }, 400);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const validatedData = schema.parse(params);
      c.set('validatedParams', validatedData);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation Error',
          message: 'URL parameters validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        }, 400);
      }
      
      return c.json({
        error: 'Invalid Parameters',
        message: 'URL parameters validation failed',
        timestamp: new Date().toISOString(),
      }, 400);
    }
  };
}