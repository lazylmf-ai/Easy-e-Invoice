# Sentry Error Monitoring Setup

This document describes the comprehensive Sentry error monitoring setup for the Easy e-Invoice Malaysian compliance system.

## Overview

Sentry is configured to provide:

- **Frontend Error Tracking**: Next.js client and server-side error monitoring
- **API Error Tracking**: Cloudflare Workers error monitoring
- **Performance Monitoring**: Transaction and operation tracking
- **Malaysian Business Context**: e-Invoice compliance specific error categorization
- **Privacy Protection**: Automatic filtering of sensitive Malaysian business data (TIN, NRIC, etc.)

## Configuration Files

### Frontend (Next.js)

- `apps/web/sentry.client.config.ts` - Client-side Sentry configuration
- `apps/web/sentry.server.config.ts` - Server-side Sentry configuration  
- `apps/web/sentry.edge.config.ts` - Edge runtime configuration
- `apps/web/instrumentation.ts` - Instrumentation setup
- `apps/web/next.config.js` - Next.js integration with `withSentryConfig`

### API (Cloudflare Workers)

- `apps/api/src/lib/sentry.ts` - Sentry utilities and initialization
- Enhanced error handling in `apps/api/src/index.ts`

### Monitoring Utilities

- `apps/web/src/lib/monitoring.ts` - Malaysian business-specific monitoring tools
- `apps/web/src/components/ErrorBoundary.tsx` - React error boundaries with Sentry integration

## Environment Variables

### Frontend (.env.local)

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=easy-e-invoice-web  
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ENVIRONMENT=development|staging|production
```

### API (.dev.vars)

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development|staging|production
NODE_ENV=development|production
```

## Malaysian Business Context

### Automatic Tagging

All errors are automatically tagged with:

- `country: "MY"`
- `compliance: "lhdn"`  
- `business_system: "malaysian_einvoice"`
- `target_market: "micro_sme"`

### Privacy Protection

Sensitive Malaysian data is automatically filtered:

- **TIN Numbers**: Only first 3 characters stored
- **NRIC/Passport**: Completely filtered
- **SST Numbers**: Partially filtered
- **Bank Details**: Completely filtered
- **Personal Information**: Email, phone, address filtered

### Business Operations Tracking

#### Invoice Operations
- Invoice creation, validation, export, import
- Compliance scoring (0-100)
- Malaysian validation rule execution
- SST calculation tracking
- B2C consolidation rule checking

#### File Processing
- CSV import with progress tracking
- PDF/JSON export monitoring
- Processing time and error rates
- Quality metrics (success rate, error count)

#### User Journey
- Onboarding completion
- Feature adoption
- Compliance level progression

## Custom Error Types

### Validation Errors
- TIN format validation failures
- SST calculation errors  
- Exchange rate requirement violations
- Industry-specific B2C consolidation violations

### Compliance Errors
- LHDN requirement violations
- MyInvois format incompatibilities
- Regulatory deadline violations

### Performance Issues
- Slow validation processing
- File processing timeouts
- Database connection issues

## Usage Examples

### Basic Error Reporting

```typescript
import { reportError } from '@/lib/monitoring';

try {
  // Malaysian e-Invoice operation
} catch (error) {
  reportError(error, {
    feature: 'invoice_validation',
    operation: 'tin_validation',
    organizationId: 'org_123',
  });
}
```

### Performance Tracking

```typescript
import { MalaysianBusinessMonitor } from '@/lib/monitoring';

const tracker = MalaysianBusinessMonitor.trackInvoiceOperation('validate', {
  invoiceType: '01', // Standard invoice
  currency: 'MYR',
  complianceScore: 95,
  organizationTin: 'C1234567890',
});

// Perform operation...

tracker.finish();
```

### Compliance Issue Reporting

```typescript
MalaysianBusinessMonitor.reportComplianceIssue({
  type: 'validation_error',
  rule: 'TIN_FORMAT_VALIDATION',
  message: 'TIN must follow Malaysian format (C1234567890)',
  fieldPath: 'supplier.tin',
  severity: 'high',
  suggestions: [
    'Use format C followed by 10 digits',
    'Or use 12-digit GST format'
  ],
});
```

### User Context Setting

```typescript
MalaysianBusinessMonitor.setUserContext({
  id: 'user_123',
  organizationId: 'org_456',
  organizationName: 'Sample Sdn Bhd',
  tinPrefix: 'C12', // Only first 3 chars for privacy
  hasCompletedOnboarding: true,
  subscriptionTier: 'professional',
});
```

## Error Boundary Integration

React error boundaries automatically capture and report errors with Malaysian business context:

```typescript
import { ErrorBoundary, InvoiceErrorFallback } from '@/components/ErrorBoundary';

// Use specific fallback for invoice operations
<ErrorBoundary fallback={InvoiceErrorFallback}>
  <InvoiceForm />
</ErrorBoundary>
```

## API Error Handling

Cloudflare Workers automatically capture errors with enhanced context:

```typescript
// Automatic in API routes
app.onError((err, c) => {
  // Sentry integration handles Malaysian context
  captureInvoiceError(err, {
    operation: 'api_request',
    invoiceId: c.req.query('invoiceId'),
    organizationId: c.req.query('organizationId'),
  });
});
```

## Dashboard and Alerts

### Key Metrics to Monitor

1. **Compliance Score Distribution**
   - Track validation scores across users
   - Identify common compliance issues
   - Monitor improvement trends

2. **Error Rates by Feature**
   - Invoice validation failures
   - File processing errors  
   - Template system issues
   - Import/export problems

3. **Performance Metrics**
   - API response times
   - File processing duration
   - Validation execution time
   - Database query performance

4. **User Journey Health**
   - Onboarding completion rates
   - Feature adoption metrics
   - Drop-off points identification

### Recommended Alerts

- High error rate (>5%) for any Malaysian validation rule
- Compliance score dropping below 70% for any organization
- File processing failures exceeding 10%
- API response times exceeding 5 seconds
- Critical TIN validation failures

## Development vs Production

### Development
- Full error details exposed
- 100% transaction sampling
- Verbose logging enabled
- All breadcrumbs captured

### Production  
- Sensitive data filtered
- 10% transaction sampling
- User-friendly error messages
- Essential breadcrumbs only

## Security Considerations

1. **Data Privacy**: All PII automatically filtered
2. **Malaysian Compliance**: PDPA requirements met
3. **Access Control**: Team-based Sentry access
4. **Retention**: Error data retained per policy
5. **Encryption**: All data encrypted in transit/rest

## Integration Testing

Test error reporting in development:

```bash
# Frontend
npm run dev
# Visit http://localhost:3000/test-error (if implemented)

# API  
wrangler dev
# Send request to /test-error endpoint (if implemented)
```

## Monitoring Dashboard URLs

- **Sentry Dashboard**: https://sentry.io/organizations/[ORG]/projects/
- **Performance**: https://sentry.io/organizations/[ORG]/performance/
- **Alerts**: https://sentry.io/organizations/[ORG]/alerts/

## Support and Maintenance

- **Error Triage**: Daily review of new error types
- **Performance Review**: Weekly performance metrics analysis  
- **Alert Tuning**: Monthly alert threshold adjustments
- **Documentation**: Quarterly updates to this guide

This comprehensive Sentry setup ensures reliable error monitoring while respecting Malaysian data privacy requirements and providing meaningful business context for debugging and optimization.