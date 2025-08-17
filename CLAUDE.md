# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Easy e-Invoice** project - a Malaysian e-Invoice compliance helper for micro-SMEs. The project is currently in the planning phase with comprehensive documentation but no implemented code yet.

## Current Status

This repository contains **planning documentation only**:
- `hybrid_prd_mvp.md` - Complete Product Requirements Document
- `technical_implementation_guide.md` - Step-by-step technical implementation guide

**No code has been implemented yet** - this is a greenfield project ready for development.

## Architecture Overview

### Planned Technology Stack
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **API**: Cloudflare Workers with Hono framework
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Storage**: Cloudflare R2 for file storage
- **Monorepo**: Turborepo for workspace management

### Planned Project Structure
```
einvoice-helper/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Cloudflare Workers API
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── database/            # Drizzle schema and migrations
│   └── validation/          # Malaysian validation rules
└── docs/                    # Documentation
```

## Development Commands (When Implemented)

### Initial Setup
```bash
# Install global tools
npm install -g wrangler @neondb/cli drizzle-kit turbo

# Create project structure and install dependencies
npm install

# Set up database
npm run db:generate
npm run db:push
```

### Development Workflow
```bash
# Start all development servers
npm run dev

# Start individual services
npm run api:dev    # Cloudflare Workers dev server
npm run web:dev    # Next.js dev server

# Database operations
npm run db:generate    # Generate migrations
npm run db:push       # Push schema to database
npm run db:migrate    # Run migrations

# Build and deploy
npm run build
npm run api:deploy    # Deploy to Cloudflare Workers
```

### Testing
```bash
npm run test          # Run all tests
npm run lint          # Run linting
npm run typecheck     # Run type checking
```

## Malaysian e-Invoice Compliance Features

### Core Validation Rules
- **TIN Format**: Malaysian Tax Identification Number validation (C1234567890 or 123456789012 format)
- **SST Calculation**: 6% Services and Sales Tax calculation validation
- **B2C Consolidation**: Industry-specific consolidation restrictions
- **Exchange Rates**: Foreign currency requirements for non-MYR invoices
- **Credit Notes**: Reference validation for credit/debit notes

### Prohibited Industries for B2C Consolidation
- Electric power (35101, 35102, 35103)
- Water services (36000, 37000)
- Telecommunications (61)
- Parking and toll services (52211, 52212)
- Public administration (84)

## Database Schema Highlights

### Core Tables
- `organizations` - Company profiles with TIN and SST registration
- `invoices` - Main invoice records with validation status
- `invoice_lines` - Line items with SST calculations
- `buyers` - Customer database
- `invoice_templates` - Reusable invoice templates
- `validation_results` - Compliance validation tracking

## Key Business Rules

### Validation Scoring
- 100% = Fully compliant
- 90-99% = Minor warnings
- 70-89% = Significant issues
- <70% = Major compliance problems

### User Flow
1. **Onboarding**: 10-minute setup with TIN validation
2. **Invoice Creation**: Real-time validation with Malaysian rules
3. **Export Options**: PDF (draft), JSON (MyInvois compatible), CSV
4. **Template System**: Save and reuse common invoice patterns

## Implementation Priority

### Phase 1 (MVP - 8 weeks)
1. Authentication system (magic link)
2. Organization setup and TIN validation
3. Basic invoice CRUD with Malaysian validation
4. CSV import/export functionality
5. Template system

### Phase 2 (Growth - 6 weeks)
1. Background file processing
2. MyInvois API integration
3. Enhanced security and audit logging
4. Advanced analytics

## Environment Variables

### API (apps/api/.env)
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
RESEND_API_KEY=your-resend-key
```

### Frontend (apps/web/.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
```

## Security Considerations

- JWT authentication with 24-hour expiry
- PDPA (Malaysian data protection) compliance
- Rate limiting and IP-based restrictions
- TLS 1.3 for all communications
- Audit logging for compliance tracking

## Malaysian Regulatory Context

- **LHDN**: Lembaga Hasil Dalam Negeri (Inland Revenue Board)
- **MyInvois Portal**: Official government e-Invoice submission system
- **Implementation Timeline**: Phased rollout 2024-2027 by business size
- **Compliance Requirement**: Mandatory for businesses >RM25M revenue from Jan 2025

## File Structure Notes

When implementing:
- Keep validation rules in separate package for modularity
- Use Drizzle schema-first approach for type safety
- Implement comprehensive error handling with user-friendly messages
- Follow Malaysian business practices (currency formatting, date formats)
- Ensure all user-facing text supports English and Bahasa Malaysia

## Testing Strategy

- Unit tests for all validation rules (>90% coverage)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for file processing
- Compliance testing with real Malaysian data