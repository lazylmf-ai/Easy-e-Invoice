# Easy e-Invoice Admin Guide

## Overview

This guide provides system administrators with comprehensive information for managing, monitoring, and troubleshooting the Easy e-Invoice platform.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Administration Dashboard](#administration-dashboard)
3. [User Management](#user-management)
4. [Organization Management](#organization-management)
5. [System Monitoring](#system-monitoring)
6. [Performance Optimization](#performance-optimization)
7. [Security Management](#security-management)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Emergency Procedures](#emergency-procedures)

---

## System Architecture

### Platform Components

**Frontend (Next.js)**
- **URL**: https://yourdomain.com
- **CDN**: Cloudflare
- **Hosting**: Vercel
- **Caching**: Edge caching with 24-hour TTL

**API (Cloudflare Workers)**
- **URL**: https://api.yourdomain.com
- **Runtime**: Cloudflare Workers
- **Database**: Neon PostgreSQL
- **Caching**: Redis with Cloudflare KV fallback

**Storage**
- **Files**: Cloudflare R2
- **Backups**: Cross-region replication
- **CDN**: Global edge distribution

### Infrastructure Dependencies

**External Services:**
- **Database**: Neon PostgreSQL (Primary)
- **Cache**: Redis Cloud
- **Email**: Resend API
- **Monitoring**: Sentry + Custom metrics
- **MyInvois**: LHDN e-Invoice API

**Security Services:**
- **WAF**: Cloudflare Web Application Firewall
- **DDoS**: Cloudflare DDoS Protection
- **SSL**: Cloudflare SSL/TLS
- **Rate Limiting**: Custom + Cloudflare

---

## Administration Dashboard

### Accessing Admin Panel

**URL**: https://yourdomain.com/admin
**Authentication**: Admin-level JWT tokens
**MFA**: Required for all admin access

### Dashboard Overview

**System Health:**
- ✅ **All Systems Operational**
- 🔄 **Partial Outage**
- ❌ **Major Outage**

**Key Metrics (Real-time):**
- Active users: 1,247
- Invoices processed today: 3,842
- API response time: 187ms avg
- Error rate: 0.02%
- Cache hit rate: 94.3%

### Admin Menu Structure

```
Dashboard
├── System Health
├── Analytics
├── Users
├── Organizations
├── Invoices
├── Reports
├── Settings
├── Monitoring
├── Security
└── Maintenance
```

---

## User Management

### User Roles and Permissions

**Super Admin**
- Full system access
- User management
- System configuration
- Emergency procedures
- Financial reports

**Admin**
- User management (limited)
- Organization management
- Invoice oversight
- Support operations
- Basic reports

**Support Agent**
- User support
- Basic user management
- Invoice viewing
- Help desk operations
- Customer communication

**Compliance Officer**
- Malaysian compliance monitoring
- Validation rule management
- Audit reports
- LHDN integration oversight
- Regulatory updates

### User Management Tasks

#### Creating Admin Users

1. **Navigate** to Admin → Users → Add User
2. **Enter** user details:
   ```
   Email: admin@yourcompany.com
   Name: Admin User
   Role: Admin
   Department: Operations
   ```
3. **Set** permissions:
   - User management: ✅
   - Organization management: ✅
   - System settings: ❌
   - Financial data: ✅
4. **Send** invitation email
5. **Monitor** activation status

#### User Account Management

**Account Status Options:**
- **Active**: Normal access
- **Suspended**: Temporary access restriction
- **Locked**: Security lockout (multiple failed logins)
- **Disabled**: Permanent access revocation

**Common Tasks:**
```bash
# Reset user password
POST /admin/api/users/{userId}/reset-password

# Suspend user account
PUT /admin/api/users/{userId}/suspend

# View user activity log
GET /admin/api/users/{userId}/activity

# Export user data (PDPA compliance)
GET /admin/api/users/{userId}/export
```

#### Bulk Operations

**User Import:**
1. **Download** CSV template
2. **Fill** user information
3. **Upload** and validate
4. **Review** import results
5. **Send** activation emails

**User Export:**
- All users: CSV/JSON format
- Filtered users: By role, status, date
- Activity reports: Login history, actions

---

## Organization Management

### Organization Oversight

**Organization Status:**
- **Active**: Fully operational
- **Trial**: Limited time/features
- **Suspended**: Payment issues
- **Compliance Hold**: Regulatory issues
- **Inactive**: Voluntary suspension

### Compliance Management

#### TIN Validation Override

Sometimes manual intervention is needed for TIN validation:

```sql
-- View TIN validation issues
SELECT o.id, o.name, o.tin, o.tin_validated, o.tin_validation_error
FROM organizations o 
WHERE tin_validated = false;

-- Manual TIN validation (after verification)
UPDATE organizations 
SET tin_validated = true, 
    tin_validation_error = null,
    updated_at = NOW()
WHERE id = 'org_123' AND tin = 'C1234567890';
```

#### Industry Code Management

**MSIC 2008 Code Updates:**
1. **Monitor** government updates
2. **Update** validation rules
3. **Notify** affected organizations
4. **Provide** migration guidance

**Code Validation:**
```javascript
// Validate industry code
const validateIndustryCode = async (code) => {
  const response = await fetch('/admin/api/validation/industry-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return response.json();
};
```

### Organization Support Tasks

#### Account Recovery

**Steps for locked accounts:**
1. **Verify** organization identity
2. **Check** compliance status
3. **Reset** authentication tokens
4. **Enable** account access
5. **Monitor** subsequent activity

#### Data Migration

**For system upgrades or changes:**
```bash
# Export organization data
curl -X GET "https://api.yourdomain.com/admin/organizations/{orgId}/export" \
  -H "Authorization: Bearer {admin-token}"

# Import to new system
curl -X POST "https://api.yourdomain.com/admin/organizations/import" \
  -H "Authorization: Bearer {admin-token}" \
  -F "file=@organization-data.json"
```

---

## System Monitoring

### Health Checks

**Automated Monitoring:**
- **API Health**: https://api.yourdomain.com/health
- **Database**: Connection pooling and query performance
- **External Services**: MyInvois, Resend, Redis availability
- **File Storage**: Cloudflare R2 accessibility

**Health Check Schedule:**
```
Every 30 seconds: API endpoints
Every 1 minute: Database connectivity
Every 5 minutes: External services
Every 15 minutes: Comprehensive system check
```

### Performance Monitoring

**Key Metrics Dashboard:**

| Metric | Current | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| API Response Time | 187ms | <200ms | >500ms |
| Database Query Time | 45ms | <50ms | >100ms |
| Error Rate | 0.02% | <0.1% | >1% |
| Cache Hit Rate | 94.3% | >90% | <85% |
| File Upload Success | 99.8% | >99% | <95% |

**Performance Alerts:**
- **Critical**: System unavailable, data corruption
- **High**: Performance degradation, service failures
- **Medium**: Capacity warnings, optimization needed
- **Low**: Maintenance reminders, minor issues

### Log Management

**Log Categories:**
- **Application Logs**: Application events and errors
- **Access Logs**: API requests and responses
- **Security Logs**: Authentication and authorization events
- **Audit Logs**: Malaysian compliance and business events

**Log Retention:**
```
Access Logs: 90 days
Application Logs: 180 days
Security Logs: 365 days
Audit Logs: 7 years (Malaysian compliance requirement)
```

**Log Analysis Commands:**
```bash
# Search for errors in last 24 hours
grep -i "error" /logs/application-$(date +%Y-%m-%d).log

# Monitor real-time API requests
tail -f /logs/access.log | grep "POST /api/invoices"

# Find failed login attempts
grep "authentication failed" /logs/security.log | tail -20
```

---

## Performance Optimization

### Database Optimization

**Query Performance:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index usage analysis
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('invoices', 'organizations', 'buyers')
ORDER BY n_distinct DESC;
```

**Connection Pool Management:**
- **Pool Size**: 20 connections (production)
- **Max Lifetime**: 30 minutes
- **Idle Timeout**: 10 minutes
- **Connection Retry**: 3 attempts with exponential backoff

### Cache Optimization

**Redis Cache Management:**
```bash
# Monitor cache performance
redis-cli info stats

# Check memory usage
redis-cli info memory

# Find cache hit/miss ratio
redis-cli info stats | grep -E "(hits|misses)"

# Clear specific cache patterns
redis-cli --eval flush_pattern.lua 0 "validation:*"
```

**Cache Strategy:**
- **TIN Validation**: 24 hours TTL
- **Industry Codes**: 7 days TTL
- **SST Rates**: 24 hours TTL
- **Exchange Rates**: 1 hour TTL
- **User Sessions**: 24 hours TTL

### CDN Optimization

**Cloudflare Settings:**
```javascript
// Cache rules configuration
const cacheRules = {
  static_assets: {
    ttl: 31536000, // 1 year
    pattern: "*.{js,css,png,jpg,gif,woff2}"
  },
  api_responses: {
    ttl: 300, // 5 minutes
    pattern: "/api/validation/*"
  },
  dynamic_content: {
    ttl: 60, // 1 minute
    pattern: "/api/invoices/*"
  }
};
```

**Purge Cache:**
```bash
# Purge all cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "X-Auth-Email: your-email@domain.com" \
  -H "X-Auth-Key: your-api-key" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific URLs
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "X-Auth-Email: your-email@domain.com" \
  -H "X-Auth-Key: your-api-key" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://yourdomain.com/api/validation/rules"]}'
```

---

## Security Management

### Access Control

**Authentication Methods:**
- **Magic Link**: Primary method for users
- **JWT Tokens**: API authentication
- **Admin Passwords**: Admin panel access with MFA

**Session Management:**
```javascript
// Session monitoring
const activeSessions = await redis.keys('session:*');
const sessionCount = activeSessions.length;

// Force logout user
await redis.del(`session:${userId}`);
await revokeJWTToken(tokenId);
```

### Security Monitoring

**Threat Detection:**
- **Brute Force**: >5 failed logins in 15 minutes
- **Suspicious Activity**: Unusual API usage patterns
- **Data Exfiltration**: Large data downloads
- **Compliance Violations**: Invalid TIN patterns

**Security Incident Response:**
1. **Detect** security event
2. **Assess** threat level
3. **Contain** potential damage
4. **Investigate** root cause
5. **Remediate** vulnerabilities
6. **Document** incident

### Data Protection (PDPA Compliance)

**Personal Data Management:**
```sql
-- Find user's personal data
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('email', 'phone', 'address', 'ic_number')
AND table_schema = 'public';

-- Data deletion (Right to be forgotten)
BEGIN;
  DELETE FROM buyers WHERE user_id = 'user_123';
  DELETE FROM invoices WHERE organization_id IN 
    (SELECT id FROM organizations WHERE user_id = 'user_123');
  DELETE FROM organizations WHERE user_id = 'user_123';
  DELETE FROM users WHERE id = 'user_123';
COMMIT;
```

**Data Export (PDPA Subject Access Rights):**
```javascript
const exportUserData = async (userId) => {
  const userData = {
    profile: await getUserProfile(userId),
    organizations: await getUserOrganizations(userId),
    invoices: await getUserInvoices(userId),
    buyers: await getUserBuyers(userId),
    activity: await getUserActivity(userId)
  };
  
  return {
    exportDate: new Date().toISOString(),
    userId: userId,
    data: userData
  };
};
```

---

## Troubleshooting Guide

### Common Issues

#### 1. API Performance Issues

**Symptoms:**
- Slow API response times (>2 seconds)
- Timeout errors
- High CPU usage

**Diagnostic Steps:**
```bash
# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.yourdomain.com/health

# Monitor database connections
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = 'einvoice_db' 
GROUP BY state;

# Check Redis performance
redis-cli --latency-history -i 1

# Review recent errors
tail -100 /logs/application-$(date +%Y-%m-%d).log | grep ERROR
```

**Solutions:**
1. **Scale database** connections if pool exhausted
2. **Clear cache** if Redis memory full
3. **Restart API** workers if memory leaks detected
4. **Enable query optimization** for slow queries

#### 2. Authentication Issues

**Symptoms:**
- Users can't log in
- Magic links not working
- JWT token validation failures

**Diagnostic Steps:**
```bash
# Check email service status
curl -X GET "https://api.resend.com/domains" \
  -H "Authorization: Bearer {resend-api-key}"

# Verify JWT secret configuration
echo $JWT_SECRET | wc -c  # Should be 32+ characters

# Check failed login attempts
grep "authentication failed" /logs/security.log | tail -20

# Test magic link generation
curl -X POST "https://api.yourdomain.com/api/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Solutions:**
1. **Verify email service** configuration and credits
2. **Check JWT secret** environment variable
3. **Clear rate limits** for legitimate users
4. **Restart authentication** service if needed

#### 3. Invoice Validation Failures

**Symptoms:**
- All invoices failing validation
- Specific validation rules always failing
- Malaysian compliance errors

**Diagnostic Steps:**
```javascript
// Test validation rules
const testInvoice = {
  invoiceNumber: 'TEST-001',
  issueDate: '2024-01-15',
  currency: 'MYR',
  // ... other required fields
};

const result = await validateInvoice(testInvoice);
console.log('Validation result:', result);

// Check rule definitions
const rules = await getMalaysianValidationRules();
console.log('Active rules:', rules.length);
```

**Solutions:**
1. **Update validation rules** if LHDN guidelines changed
2. **Fix TIN validation** service if connection issues
3. **Refresh industry codes** cache
4. **Check SST rate** configurations

#### 4. File Upload Issues

**Symptoms:**
- CSV uploads failing
- File processing timeouts
- Corrupted file downloads

**Diagnostic Steps:**
```bash
# Check Cloudflare R2 status
curl -X GET "https://your-account.r2.cloudflarestorage.com" \
  -H "Authorization: Bearer {r2-token}"

# Monitor file processing queue
redis-cli LLEN file_processing_queue

# Check disk space
df -h

# Review upload logs
grep "file upload" /logs/application-$(date +%Y-%m-%d).log
```

**Solutions:**
1. **Verify R2 credentials** and bucket permissions
2. **Increase processing** timeout limits
3. **Clear processing queue** if backlogged
4. **Add more storage** if space is low

### Advanced Troubleshooting

#### Database Connection Pool Exhaustion

**Detection:**
```sql
SELECT state, count(*) as connections
FROM pg_stat_activity 
WHERE datname = 'einvoice_db'
GROUP BY state;
```

**If too many active connections:**
```sql
-- Find long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;

-- Terminate problematic queries (careful!)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '30 minutes'
AND state = 'active';
```

#### Memory Leaks

**Detection:**
```bash
# Monitor memory usage
ps aux | grep node | awk '{print $4, $11}' | sort -nr

# Check for memory growth pattern
while true; do
  ps -o pid,vsz,rss,comm -p $(pgrep -f "node.*server.js")
  sleep 60
done
```

**Mitigation:**
1. **Restart affected processes**
2. **Enable garbage collection** monitoring
3. **Identify memory-intensive** operations
4. **Implement memory limits** for workers

---

## Maintenance Procedures

### Regular Maintenance Schedule

**Daily Tasks:**
- Monitor system health dashboard
- Review error logs and alerts
- Check backup completion status
- Verify external service connectivity

**Weekly Tasks:**
- Database performance review
- Cache optimization analysis
- Security log audit
- User activity report

**Monthly Tasks:**
- Database maintenance (VACUUM, REINDEX)
- Log rotation and archival
- Performance trend analysis
- Capacity planning review

### Database Maintenance

**Monthly Database Cleanup:**
```sql
-- Vacuum and analyze all tables
VACUUM ANALYZE;

-- Update table statistics
ANALYZE;

-- Check for bloated tables
SELECT schemaname, tablename, 
       n_dead_tup, n_live_tup,
       ROUND(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_percentage DESC;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_invoices_organization_id;
```

**Backup Verification:**
```bash
# Test database backup restoration
pg_restore --list backup_file.dump | head -20

# Verify backup integrity
pg_restore --schema-only --no-owner --no-privileges backup_file.dump > /tmp/schema.sql
```

### System Updates

**Update Procedure:**
1. **Schedule maintenance window** (off-peak hours)
2. **Notify users** of planned maintenance
3. **Create system snapshot** for rollback
4. **Deploy updates** to staging environment
5. **Run automated tests** on staging
6. **Deploy to production** if tests pass
7. **Monitor system health** post-deployment
8. **Notify users** when complete

**Rollback Procedure:**
```bash
# If deployment fails, immediate rollback
git checkout previous-release-tag
docker-compose up -d --force-recreate

# Database rollback (if schema changes)
pg_restore --clean --if-exists backup_before_update.dump

# Clear application cache
redis-cli FLUSHDB

# Verify system functionality
curl https://api.yourdomain.com/health
```

---

## Emergency Procedures

### Incident Response Team

**Primary Contacts:**
- **Incident Commander**: CTO/Engineering Lead
- **Technical Lead**: Senior Developer
- **Communication Lead**: Product Manager
- **Compliance Officer**: Legal/Compliance Team

### Severity Levels

**P1 - Critical (Immediate Response)**
- Complete system outage
- Data corruption or loss
- Security breaches
- Malaysian compliance violations

**P2 - High (Response within 2 hours)**
- Partial system outage
- Performance degradation
- External service failures
- Payment processing issues

**P3 - Medium (Response within 4 hours)**
- Non-critical feature failures
- Minor performance issues
- Integration problems
- User experience issues

**P4 - Low (Response within 24 hours)**
- Enhancement requests
- Minor bug fixes
- Documentation updates
- Monitoring improvements

### Emergency Response Procedures

#### System Outage Response

**Immediate Actions (0-15 minutes):**
1. **Acknowledge incident** in monitoring system
2. **Assess impact** and assign severity level
3. **Activate incident response** team
4. **Post initial status** update
5. **Begin technical investigation**

**Investigation Phase (15-60 minutes):**
```bash
# Check system health
curl https://api.yourdomain.com/health

# Review recent deployments
git log --oneline --since="2 hours ago"

# Check external service status
curl https://status.neon.tech
curl https://status.cloudflare.com
curl https://status.resend.com

# Monitor error rates
grep -c "ERROR" /logs/application-$(date +%Y-%m-%d).log
```

**Resolution Phase:**
1. **Implement fix** or rollback
2. **Verify system recovery**
3. **Monitor for regression**
4. **Update status page**
5. **Conduct post-mortem**

#### Data Breach Response

**Immediate Actions (0-30 minutes):**
1. **Isolate affected systems**
2. **Preserve evidence** for investigation
3. **Notify security team**
4. **Begin impact assessment**
5. **Document timeline** of events

**Investigation Phase (30 minutes - 24 hours):**
1. **Determine scope** of breach
2. **Identify compromised** data
3. **Assess root cause**
4. **Implement containment** measures
5. **Prepare regulatory** notifications

**Recovery Phase:**
1. **Implement security** improvements
2. **Restore affected** systems
3. **Notify affected** customers (PDPA requirement)
4. **Submit regulatory** reports if required
5. **Review and update** security policies

### Contact Information

**24/7 Emergency Contacts:**
- **Primary On-call**: +60 12-345-6789
- **Secondary On-call**: +60 19-876-5432
- **Emergency Email**: emergency@yourdomain.com
- **Incident Slack**: #incidents

**External Contacts:**
- **Hosting (Cloudflare)**: Enterprise Support
- **Database (Neon)**: Premium Support
- **Legal Counsel**: +60 3-1234-5678
- **PDPA Consultant**: +60 3-9876-5432

---

*This admin guide should be reviewed and updated quarterly to reflect system changes and improvements.*

*For additional support, contact the engineering team at [engineering@yourdomain.com](mailto:engineering@yourdomain.com)*