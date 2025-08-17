import { SignJWT, jwtVerify } from 'jose';
import { Resend } from 'resend';
import { z } from 'zod';

export interface AuthEnvironment {
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  FRONTEND_URL?: string;
}

const MagicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const TokenPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  type: z.enum(['auth', 'magic-link']),
  exp: z.number(),
  iat: z.number(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export class AuthService {
  private resend: Resend;
  private jwtSecret: Uint8Array;
  private frontendUrl: string;

  constructor(env: AuthEnvironment) {
    this.resend = new Resend(env.RESEND_API_KEY);
    this.jwtSecret = new TextEncoder().encode(env.JWT_SECRET);
    this.frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
  }

  async generateMagicLinkToken(email: string): Promise<string> {
    const payload = {
      email,
      type: 'magic-link' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.jwtSecret);
  }

  async generateAuthToken(userId: string, email: string): Promise<string> {
    const payload = {
      userId,
      email,
      type: 'auth' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.jwtSecret);
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return TokenPayloadSchema.parse(payload);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async sendMagicLink(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      const validation = MagicLinkRequestSchema.safeParse({ email });
      if (!validation.success) {
        return {
          success: false,
          message: 'Invalid email format',
        };
      }

      // Generate magic link token
      const token = await this.generateMagicLinkToken(email);
      const magicLink = `${this.frontendUrl}/auth/verify?token=${token}`;

      // Send email via Resend
      const { data, error } = await this.resend.emails.send({
        from: 'Easy e-Invoice <noreply@yourdomain.com>',
        to: [email],
        subject: 'Your Easy e-Invoice Login Link',
        html: this.generateMagicLinkEmailHTML(magicLink, email),
        text: this.generateMagicLinkEmailText(magicLink, email),
      });

      if (error) {
        console.error('Failed to send magic link email:', error);
        return {
          success: false,
          message: 'Failed to send login email. Please try again.',
        };
      }

      return {
        success: true,
        message: 'Login link sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Magic link generation error:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  private generateMagicLinkEmailHTML(magicLink: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Easy e-Invoice Login</title>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #ffffff; }
            .button { 
              display: inline-block; 
              background: #3b82f6; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; background: #f8fafc; font-size: 14px; color: #64748b; }
            .warning { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🇲🇾 Easy e-Invoice</h1>
              <p>Malaysian e-Invoice Compliance Helper</p>
            </div>
            
            <div class="content">
              <h2>Login to Your Account</h2>
              <p>Hello,</p>
              <p>You requested to log in to your Easy e-Invoice account with email: <strong>${email}</strong></p>
              
              <p>Click the button below to access your account:</p>
              <a href="${magicLink}" class="button">Login to Easy e-Invoice</a>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link expires in 15 minutes</li>
                  <li>Only use this link if you requested it</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${magicLink}</p>
              
              <p>If you didn't request this login, you can safely ignore this email.</p>
            </div>
            
            <div class="footer">
              <p><strong>Easy e-Invoice</strong> - Malaysian e-Invoice Compliance Helper</p>
              <p>Helping micro-SMEs comply with LHDN e-Invoice requirements</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateMagicLinkEmailText(magicLink: string, email: string): string {
    return `
Easy e-Invoice - Login Link

Hello,

You requested to log in to your Easy e-Invoice account with email: ${email}

Click this link to access your account:
${magicLink}

SECURITY NOTICE:
- This link expires in 15 minutes
- Only use this link if you requested it
- Never share this link with anyone

If you didn't request this login, you can safely ignore this email.

---
Easy e-Invoice
Malaysian e-Invoice Compliance Helper
Helping micro-SMEs comply with LHDN e-Invoice requirements
    `;
  }

  isTokenExpired(payload: TokenPayload): boolean {
    return payload.exp < Math.floor(Date.now() / 1000);
  }

  getTokenTimeRemaining(payload: TokenPayload): number {
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }
}