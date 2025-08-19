# Easy e-Invoice API Documentation

## Overview

The Easy e-Invoice API provides comprehensive Malaysian e-Invoice compliance functionality for micro-SMEs. This RESTful API enables invoice creation, validation, and submission with full LHDN (Lembaga Hasil Dalam Negeri) compliance.

## Base URL

```
Production: https://api.yourdomain.com
Staging: https://staging-api.yourdomain.com
Development: http://localhost:8787
```

## Authentication

The API uses JWT (JSON Web Token) authentication with magic link login.

### Authentication Flow

1. **Request Magic Link**: Send email address to receive login link
2. **Verify Magic Link**: Exchange magic link token for access token
3. **Use Access Token**: Include in Authorization header for API calls

```http
Authorization: Bearer your-jwt-token-here
```

### Token Expiration
- Access tokens expire after 24 hours
- Refresh tokens expire after 7 days

---

## Endpoints

### Authentication

#### POST /api/auth/magic-link
Request a magic link for authentication.

**Request Body:**
```json
{
  "email": "user@company.com",
  "redirectUrl": "https://yourdomain.com/auth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to your email",
  "expiresAt": "2024-01-15T10:00:00Z"
}
```

#### POST /api/auth/verify
Verify magic link token and get access token.

**Request Body:**
```json
{
  "token": "magic-link-token-from-email",
  "code": "6-digit-code-from-email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here",
    "expiresAt": "2024-01-16T10:00:00Z",
    "user": {
      "id": "user_123",
      "email": "user@company.com",
      "name": "John Doe",
      "organizationId": "org_456"
    }
  }
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### POST /api/auth/logout
Invalidate current session.

---

### Organizations

#### GET /api/organizations/me
Get current user's organization information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org_456",
    "name": "Acme Sdn Bhd",
    "tin": "C1234567890",
    "businessType": "sdn_bhd",
    "industryCode": "46900",
    "address": {
      "line1": "123 Jalan Bukit Bintang",
      "line2": "Level 5",
      "city": "Kuala Lumpur",
      "state": "Wilayah Persekutuan Kuala Lumpur",
      "postcode": "50450",
      "country": "Malaysia"
    },
    "contact": {
      "email": "finance@acme.com.my",
      "phone": "+60123456789"
    },
    "settings": {
      "currency": "MYR",
      "sstRegistered": true,
      "sstRate": 6,
      "invoiceNumberPrefix": "INV",
      "defaultPaymentTerms": 30
    },
    "compliance": {
      "lhdnRegistered": true,
      "pdpaCompliant": true,
      "lastValidated": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### PUT /api/organizations/me
Update organization information.

**Request Body:**
```json
{
  "name": "Acme Sdn Bhd",
  "address": {
    "line1": "123 Jalan Bukit Bintang",
    "line2": "Level 5",
    "city": "Kuala Lumpur",
    "state": "Wilayah Persekutuan Kuala Lumpur",
    "postcode": "50450",
    "country": "Malaysia"
  },
  "contact": {
    "email": "finance@acme.com.my",
    "phone": "+60123456789"
  },
  "settings": {
    "sstRegistered": true,
    "invoiceNumberPrefix": "INV"
  }
}
```

#### POST /api/organizations/validate-tin
Validate Malaysian TIN number.

**Request Body:**
```json
{
  "tin": "C1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "type": "corporate",
    "format": "C + 10 digits",
    "details": {
      "entityType": "Private Limited Company",
      "registrationRequired": true,
      "sstApplicable": true
    }
  }
}
```

---

### Invoices

#### GET /api/invoices
List invoices with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status (`draft`, `pending`, `approved`, `rejected`)
- `dateFrom` (string): Filter from date (ISO 8601)
- `dateTo` (string): Filter to date (ISO 8601)
- `search` (string): Search in invoice number, buyer name
- `sortBy` (string): Sort field (`createdAt`, `issueDate`, `grandTotal`)
- `sortOrder` (string): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "inv_789",
        "invoiceNumber": "INV-2024-001",
        "eInvoiceType": "01",
        "issueDate": "2024-01-15",
        "dueDate": "2024-02-15",
        "currency": "MYR",
        "exchangeRate": "1.000000",
        "subtotal": "1000.00",
        "sstAmount": "60.00",
        "grandTotal": "1060.00",
        "status": "draft",
        "validationScore": 95,
        "buyer": {
          "id": "buyer_123",
          "name": "Customer Sdn Bhd",
          "tin": "C9876543210"
        },
        "createdAt": "2024-01-15T08:00:00Z",
        "updatedAt": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/invoices/:id
Get specific invoice details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "inv_789",
    "invoiceNumber": "INV-2024-001",
    "eInvoiceType": "01",
    "issueDate": "2024-01-15",
    "dueDate": "2024-02-15",
    "currency": "MYR",
    "exchangeRate": "1.000000",
    "isConsolidated": false,
    "referenceInvoiceId": null,
    "supplier": {
      "name": "Your Company Sdn Bhd",
      "tin": "C1234567890",
      "address": {
        "line1": "123 Jalan Bukit Bintang",
        "city": "Kuala Lumpur",
        "state": "Wilayah Persekutuan Kuala Lumpur",
        "postcode": "50450",
        "country": "Malaysia"
      }
    },
    "buyer": {
      "id": "buyer_123",
      "name": "Customer Sdn Bhd",
      "tin": "C9876543210",
      "address": {
        "line1": "456 Jalan Raja Chulan",
        "city": "Kuala Lumpur",
        "state": "Wilayah Persekutuan Kuala Lumpur",
        "postcode": "50200",
        "country": "Malaysia"
      },
      "contact": {
        "email": "accounts@customer.com.my",
        "phone": "+60198765432"
      }
    },
    "lineItems": [
      {
        "id": "line_1",
        "sequenceNumber": 1,
        "description": "Professional Services",
        "quantity": "10.00",
        "unitPrice": "100.00",
        "measurement": "unit",
        "discountAmount": "0.00",
        "lineTotal": "1000.00",
        "sstRate": "6.00",
        "sstAmount": "60.00",
        "lineTotalWithSst": "1060.00",
        "classification": {
          "category": "Services",
          "code": "85421"
        }
      }
    ],
    "totals": {
      "subtotal": "1000.00",
      "totalDiscount": "0.00",
      "sstAmount": "60.00",
      "grandTotal": "1060.00"
    },
    "paymentTerms": {
      "days": 30,
      "description": "Net 30 days"
    },
    "status": "draft",
    "validationScore": 95,
    "validationResults": [
      {
        "ruleCode": "MY-001",
        "severity": "warning",
        "message": "Consider adding bank account details for faster payment",
        "field": "paymentDetails"
      }
    ],
    "compliance": {
      "lhdnCompliant": true,
      "sstCompliant": true,
      "formatCompliant": true
    },
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-01-15T09:00:00Z"
  }
}
```

#### POST /api/invoices
Create new invoice.

**Request Body:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "eInvoiceType": "01",
  "issueDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "currency": "MYR",
  "exchangeRate": "1.000000",
  "buyer": {
    "name": "Customer Sdn Bhd",
    "tin": "C9876543210",
    "address": {
      "line1": "456 Jalan Raja Chulan",
      "city": "Kuala Lumpur",
      "state": "Wilayah Persekutuan Kuala Lumpur",
      "postcode": "50200",
      "country": "Malaysia"
    },
    "contact": {
      "email": "accounts@customer.com.my",
      "phone": "+60198765432"
    }
  },
  "lineItems": [
    {
      "description": "Professional Services",
      "quantity": "10.00",
      "unitPrice": "100.00",
      "measurement": "unit",
      "sstRate": "6.00",
      "classification": {
        "category": "Services",
        "code": "85421"
      }
    }
  ],
  "paymentTerms": {
    "days": 30,
    "description": "Net 30 days"
  },
  "notes": "Thank you for your business"
}
```

#### PUT /api/invoices/:id
Update existing invoice (only in draft status).

#### DELETE /api/invoices/:id
Delete invoice (only in draft status).

#### POST /api/invoices/:id/validate
Validate invoice against Malaysian compliance rules.

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "score": 95,
    "results": [
      {
        "ruleCode": "MY-001",
        "ruleName": "TIN Format Validation",
        "severity": "error",
        "status": "passed",
        "message": "TIN format is valid"
      },
      {
        "ruleCode": "MY-006",
        "ruleName": "Payment Details",
        "severity": "warning",
        "status": "warning",
        "message": "Consider adding bank account details",
        "suggestion": "Add bank account information for faster payment processing"
      }
    ],
    "compliance": {
      "lhdnCompliant": true,
      "sstCompliant": true,
      "formatCompliant": true,
      "missingFields": [],
      "recommendedActions": [
        "Add bank account details"
      ]
    }
  }
}
```

#### POST /api/invoices/:id/submit
Submit invoice to MyInvois (LHDN system).

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "sub_123456",
    "myinvoisId": "MYI-2024-001-789",
    "status": "submitted",
    "submittedAt": "2024-01-15T10:00:00Z",
    "acknowledgment": {
      "received": true,
      "reference": "LHDN-2024-001-789",
      "timestamp": "2024-01-15T10:00:05Z"
    }
  }
}
```

---

### Buyers

#### GET /api/buyers
List buyers with pagination.

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder`

#### POST /api/buyers
Create new buyer.

**Request Body:**
```json
{
  "name": "Customer Sdn Bhd",
  "tin": "C9876543210",
  "email": "accounts@customer.com.my",
  "phone": "+60198765432",
  "address": {
    "line1": "456 Jalan Raja Chulan",
    "city": "Kuala Lumpur",
    "state": "Wilayah Persekutuan Kuala Lumpur",
    "postcode": "50200",
    "country": "Malaysia"
  },
  "businessType": "sdn_bhd",
  "industryCode": "46900"
}
```

---

### Templates

#### GET /api/templates
List invoice templates.

#### POST /api/templates
Create new template.

**Request Body:**
```json
{
  "name": "Standard Service Template",
  "description": "Template for professional services",
  "template": {
    "currency": "MYR",
    "paymentTerms": {
      "days": 30
    },
    "lineItems": [
      {
        "description": "Professional Services",
        "unitPrice": "100.00",
        "measurement": "hour",
        "sstRate": "6.00"
      }
    ]
  }
}
```

---

### Import/Export

#### POST /api/import/csv
Import invoices from CSV file.

**Request (multipart/form-data):**
- `file`: CSV file
- `template` (optional): Template ID for mapping

**Response:**
```json
{
  "success": true,
  "data": {
    "importId": "imp_123",
    "status": "processing",
    "summary": {
      "totalRows": 100,
      "validRows": 85,
      "invalidRows": 15,
      "estimatedTime": "2 minutes"
    },
    "errors": [
      {
        "row": 5,
        "field": "tin",
        "message": "Invalid TIN format",
        "value": "123456"
      }
    ]
  }
}
```

#### GET /api/import/:id/status
Check import status.

#### GET /api/export/invoices
Export invoices to various formats.

**Query Parameters:**
- `format`: `csv`, `pdf`, `json`
- `dateFrom`, `dateTo`: Date range
- `status`: Status filter

**Response:** File download or export job ID for large datasets.

---

### Malaysian Validation

#### POST /api/validation/tin
Validate Malaysian TIN.

#### POST /api/validation/industry-code
Validate MSIC 2008 industry code.

#### POST /api/validation/sst
Calculate SST amount.

**Request Body:**
```json
{
  "amount": "1000.00",
  "rate": "6.00",
  "currency": "MYR"
}
```

#### GET /api/validation/rules
Get list of Malaysian validation rules.

**Response:**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "code": "MY-001",
        "name": "TIN Format Validation",
        "description": "Validates Malaysian TIN number format",
        "severity": "error",
        "category": "identity",
        "examples": ["C1234567890", "123456789012", "G1234567890"]
      }
    ]
  }
}
```

---

## Error Handling

All API endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "tin",
      "value": "invalid-tin",
      "constraint": "Must be valid Malaysian TIN format"
    },
    "timestamp": "2024-01-15T10:00:00Z",
    "correlationId": "req_123456789"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT_ERROR` | Resource conflict | 409 |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | 429 |
| `MALAYSIAN_COMPLIANCE_ERROR` | Malaysian compliance validation failed | 422 |
| `EXTERNAL_API_ERROR` | External service error (MyInvois) | 502 |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## Rate Limiting

API requests are rate limited based on authentication:

- **Authenticated requests**: 100 requests per minute
- **Authentication endpoints**: 5 requests per 15 minutes
- **File uploads**: 10 uploads per 5 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642251600
```

---

## Webhooks

Configure webhooks to receive real-time notifications about invoice status changes.

### Events

- `invoice.created`
- `invoice.validated` 
- `invoice.submitted`
- `invoice.approved`
- `invoice.rejected`
- `import.completed`
- `export.completed`

### Webhook Payload

```json
{
  "event": "invoice.submitted",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "invoiceId": "inv_789",
    "invoiceNumber": "INV-2024-001",
    "status": "submitted",
    "myinvoisId": "MYI-2024-001-789"
  },
  "organizationId": "org_456"
}
```

---

## SDKs and Examples

### cURL Examples

**Get Access Token:**
```bash
curl -X POST https://api.yourdomain.com/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "magic-link-token",
    "code": "123456"
  }'
```

**Create Invoice:**
```bash
curl -X POST https://api.yourdomain.com/api/invoices \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-2024-001",
    "eInvoiceType": "01",
    "issueDate": "2024-01-15",
    "currency": "MYR",
    "buyer": {
      "name": "Customer Sdn Bhd",
      "tin": "C9876543210"
    },
    "lineItems": [
      {
        "description": "Professional Services",
        "quantity": "10.00",
        "unitPrice": "100.00",
        "sstRate": "6.00"
      }
    ]
  }'
```

### JavaScript SDK

```javascript
import { EasyInvoiceAPI } from '@easy-einvoice/sdk';

const api = new EasyInvoiceAPI({
  baseURL: 'https://api.yourdomain.com',
  apiKey: 'your-api-key'
});

// Create invoice
const invoice = await api.invoices.create({
  invoiceNumber: 'INV-2024-001',
  eInvoiceType: '01',
  issueDate: '2024-01-15',
  currency: 'MYR',
  buyer: {
    name: 'Customer Sdn Bhd',
    tin: 'C9876543210'
  },
  lineItems: [{
    description: 'Professional Services',
    quantity: '10.00',
    unitPrice: '100.00',
    sstRate: '6.00'
  }]
});

// Validate invoice
const validation = await api.invoices.validate(invoice.id);

// Submit to MyInvois
const submission = await api.invoices.submit(invoice.id);
```

---

## Support

- **Documentation**: [https://docs.yourdomain.com](https://docs.yourdomain.com)
- **Support Email**: [support@yourdomain.com](mailto:support@yourdomain.com)
- **Status Page**: [https://status.yourdomain.com](https://status.yourdomain.com)
- **Community**: [https://community.yourdomain.com](https://community.yourdomain.com)

---

*This API documentation is automatically updated with each release. Last updated: January 2024*