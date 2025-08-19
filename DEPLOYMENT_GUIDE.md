# 🚀 Easy e-Invoice MVP Deployment Guide

## Quick Start Deployment

Your MVP is production-ready! Follow these steps to deploy to production.

### Prerequisites ✅

1. **Accounts needed:**
   - [Neon](https://neon.tech) - PostgreSQL database (free tier available)
   - [Cloudflare](https://cloudflare.com) - API hosting and domain management
   - [Vercel](https://vercel.com) - Frontend hosting (free tier available)
   - [Resend](https://resend.com) - Email service for magic links (free tier: 100/day)
   - [Sentry](https://sentry.io) - Error monitoring (optional, free tier available)

2. **Tools needed:**
   - Node.js 18+
   - npm or yarn
   - Git

### 🎯 **Option 1: Automated Deployment (Recommended)**

Use the provided deployment script:

```bash
# Run complete automated deployment
./deploy.sh

# Or run step by step:
./deploy.sh prereq     # Install required tools
./deploy.sh build      # Build the project
./deploy.sh database   # Set up database
./deploy.sh api        # Deploy API
./deploy.sh frontend   # Deploy frontend
./deploy.sh verify     # Verify deployment
```

### 🛠️ **Option 2: Manual Deployment**

#### Step 1: Database Setup (5 minutes)

1. **Create Neon Database:**
   ```bash
   # Go to https://neon.tech
   # Create account and new project
   # Copy connection string
   ```

2. **Run Migrations:**
   ```bash
   cd packages/database
   
   # Set environment variable
   export DATABASE_URL="postgresql://username:password@host/database"
   
   # Run migrations
   npm run db:push
   
   # Verify 9 tables created
   npm run db:studio
   ```

#### Step 2: API Deployment (10 minutes)

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler auth login
   ```

2. **Configure Secrets:**
   ```bash
   cd apps/api
   
   # Required secrets
   wrangler secret put DATABASE_URL      # Your Neon connection string
   wrangler secret put JWT_SECRET        # Generate: openssl rand -base64 32
   wrangler secret put RESEND_API_KEY    # From https://resend.com
   
   # Optional secrets
   wrangler secret put SENTRY_DSN        # From https://sentry.io (optional)
   ```

3. **Deploy API:**
   ```bash
   # Deploy to production
   wrangler deploy --env production
   
   # Test deployment
   curl https://your-api-domain.com/health
   ```

#### Step 3: Frontend Deployment (5 minutes)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Configure Environment:**
   ```bash
   cd apps/web
   
   # Set up project
   vercel
   
   # Add environment variables in Vercel dashboard:
   # NEXT_PUBLIC_API_URL=https://your-api-domain.com
   # NODE_ENV=production
   # NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn (optional)
   ```

3. **Deploy Frontend:**
   ```bash
   # Deploy to production
   vercel --prod
   ```

### 🔧 **Configuration Details**

#### Environment Variables

**API (Cloudflare Workers Secrets):**
```bash
DATABASE_URL=postgresql://username:password@host/database
JWT_SECRET=your-secure-random-string-min-32-chars
RESEND_API_KEY=re_xxxxx_from_resend_com
SENTRY_DSN=https://xxxxx@sentry.io/project (optional)
```

**Frontend (Vercel Environment Variables):**
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NODE_ENV=production
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/project (optional)
```

#### Domain Configuration

1. **Purchase Malaysian Domain:**
   - Recommended: `yourbrand.com.my` or `yourbrand.my`
   - Use Cloudflare for DNS management

2. **Set up Subdomains:**
   - `api.yourdomain.com` → Cloudflare Workers
   - `yourdomain.com` → Vercel

### 🧪 **Testing Your Deployment**

#### Critical User Flow Test

1. **Visit your frontend URL**
2. **Register with email** → Should receive magic link
3. **Complete onboarding** → Enter TIN, business details
4. **Create invoice** → Test Malaysian validation rules
5. **Export invoice** → Test PDF/JSON/CSV formats
6. **Import CSV** → Test bulk invoice processing

#### API Health Check

```bash
# Test API health
curl https://api.yourdomain.com/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-xx-xxT..."
}
```

### 📊 **Post-Deployment Checklist**

#### Performance Verification
- [ ] Frontend loads in <3 seconds
- [ ] API responses in <2 seconds
- [ ] Database queries optimized
- [ ] File uploads work correctly
- [ ] Email delivery functional

#### Malaysian Compliance Check
- [ ] TIN validation works (C1234567890 format)
- [ ] SST calculations accurate (6%)
- [ ] B2C consolidation rules enforced
- [ ] MyInvois JSON format valid
- [ ] Industry codes properly validated

#### Security Verification
- [ ] HTTPS enabled on all endpoints
- [ ] JWT tokens expire correctly
- [ ] Sensitive data not logged
- [ ] CORS properly configured
- [ ] Rate limiting active

### 🔍 **Monitoring Setup**

#### Error Tracking (Sentry)
```bash
# If using Sentry, verify errors are captured:
# 1. Trigger a test error
# 2. Check Sentry dashboard
# 3. Verify Malaysian context is included
```

#### Performance Monitoring
```bash
# Set up basic monitoring:
# 1. Vercel Analytics (automatic)
# 2. Cloudflare Analytics (automatic)
# 3. Database monitoring (Neon dashboard)
```

### 💰 **Cost Estimation**

**Free Tier (Development/Testing):**
- Neon: Free tier (0.5GB storage)
- Vercel: Free tier (100GB bandwidth)
- Cloudflare: Free tier (100k requests/day)
- Resend: Free tier (100 emails/day)
- **Total: $0/month**

**Production Tier (Live Business):**
- Neon: $19/month (3GB storage)
- Vercel: $20/month (Pro plan)
- Cloudflare: $20/month (Workers paid plan)
- Resend: $20/month (50k emails)
- **Total: ~$80/month**

### 🚨 **Troubleshooting**

#### Common Issues

**Database Connection Failed:**
```bash
# Check DATABASE_URL format
# Ensure IP allowlist includes 0.0.0.0/0 in Neon
# Verify SSL mode: ?sslmode=require
```

**Email Not Sending:**
```bash
# Verify RESEND_API_KEY is correct
# Check Resend dashboard for delivery status
# Ensure FROM domain is verified
```

**Frontend Not Loading:**
```bash
# Check NEXT_PUBLIC_API_URL is correct
# Verify build completed successfully
# Check Vercel deployment logs
```

### 🎉 **Success!**

Once deployed, you'll have:

- **Production-ready Malaysian e-Invoice system**
- **Complete compliance with LHDN requirements**
- **Enterprise-grade features and performance**
- **Scalable infrastructure for growth**

### 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review deployment logs
3. Test individual components
4. Verify all environment variables

Your Easy e-Invoice MVP is now ready to serve Malaysian micro-SMEs! 🇲🇾

---

**Time to deployment: 20-30 minutes**  
**Skill level required: Intermediate developer**  
**Support level: Production-ready**