import { Hono } from 'hono';
export interface Env {
    DATABASE_URL: string;
    JWT_SECRET: string;
    RESEND_API_KEY: string;
    FRONTEND_URL?: string;
    [key: string]: string | undefined;
}
declare const app: Hono<{
    Bindings: Env;
}, {}, "/">;
export default app;
