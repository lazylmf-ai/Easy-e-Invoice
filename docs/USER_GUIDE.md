# Easy e-Invoice User Guide

## Welcome to Easy e-Invoice 🎉

Easy e-Invoice is your comprehensive Malaysian e-Invoice compliance platform designed specifically for micro-SMEs. This guide will help you get started and make the most of our platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Account Setup](#account-setup)
3. [Organization Configuration](#organization-configuration)
4. [Creating Your First Invoice](#creating-your-first-invoice)
5. [Managing Buyers](#managing-buyers)
6. [Invoice Templates](#invoice-templates)
7. [Bulk Operations](#bulk-operations)
8. [Malaysian Compliance](#malaysian-compliance)
9. [Reports and Analytics](#reports-and-analytics)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Valid email address
- Malaysian business registration documents

### Supported Business Types
- **Sdn Bhd** (Private Limited Company)
- **Sole Proprietorship** 
- **Partnership**
- **NGO/Non-Profit Organizations**
- **Government Entities**

---

## Account Setup

### 1. Creating Your Account

1. **Visit** [https://yourdomain.com](https://yourdomain.com)
2. **Click** "Get Started" or "Sign Up"
3. **Enter** your business email address
4. **Check** your email for the magic link
5. **Click** the magic link to verify your account

> 💡 **Tip**: Magic links expire after 15 minutes. Request a new one if needed.

### 2. Email Verification

1. **Open** the email from Easy e-Invoice
2. **Click** "Verify Email & Continue"
3. **Enter** the 6-digit verification code
4. **Complete** your profile setup

### 3. Security Setup

- Enable two-factor authentication (recommended)
- Set up recovery email
- Review privacy settings

---

## Organization Configuration

### Step 1: Basic Information

**Required Information:**
- **Company Name**: Your registered business name
- **TIN Number**: Malaysian Tax Identification Number
- **Business Type**: Select your business structure
- **Industry Code**: MSIC 2008 classification code

**Example:**
```
Company Name: Acme Technology Sdn Bhd
TIN Number: C1234567890
Business Type: Sdn Bhd
Industry Code: 62010 (Computer Programming)
```

### Step 2: Address Details

**Business Address:**
- **Address Line 1**: Street address
- **Address Line 2**: Unit/Floor/Building (optional)
- **City**: City name
- **State**: Malaysian state
- **Postcode**: 5-digit postal code
- **Country**: Malaysia

### Step 3: Contact Information

- **Primary Email**: Business email for communications
- **Phone Number**: Business phone with country code
- **Website**: Company website (optional)

### Step 4: Tax Settings

**SST Registration:**
- ✅ **SST Registered**: If you're registered for SST
- **SST Rate**: Usually 6% (system default)
- **SST Number**: Your SST registration number

**Other Settings:**
- **Default Currency**: MYR (Malaysian Ringgit)
- **Financial Year**: Your company's financial year
- **Payment Terms**: Default payment terms (e.g., Net 30)

---

## Creating Your First Invoice

### Step 1: Start New Invoice

1. **Navigate** to Dashboard → "Create Invoice"
2. **Choose** invoice type:
   - **Standard Invoice** (most common)
   - **Credit Note** (for returns/adjustments)
   - **Debit Note** (for additional charges)

### Step 2: Invoice Details

**Basic Information:**
```
Invoice Number: INV-2024-001 (auto-generated)
Issue Date: Today's date
Due Date: 30 days from issue date
Currency: MYR
```

**Reference Information:**
- **Your Reference**: Internal reference number
- **Buyer's Reference**: Buyer's PO number
- **Payment Terms**: Net 30 days

### Step 3: Buyer Information

**New Buyer:**
1. **Click** "Add New Buyer"
2. **Enter** buyer details:
   - Company name
   - TIN number (if applicable)
   - Email address
   - Phone number
   - Business address

**Existing Buyer:**
1. **Click** "Select Existing Buyer"
2. **Search** by name or TIN
3. **Select** from the list

### Step 4: Add Line Items

**For Each Item/Service:**
1. **Description**: Clear description of goods/services
2. **Quantity**: Amount being invoiced
3. **Unit Price**: Price per unit (excluding SST)
4. **Unit of Measurement**: Units, hours, pieces, etc.
5. **Discount**: Any discount amount
6. **SST Rate**: Usually 6% for taxable items

**Example Line Item:**
```
Description: Website Development Services
Quantity: 40
Unit Price: RM 150.00
Unit: Hours
SST Rate: 6%
Line Total: RM 6,000.00
SST Amount: RM 360.00
Total with SST: RM 6,360.00
```

### Step 5: Review and Validate

1. **Review** all information carefully
2. **Click** "Validate Invoice"
3. **Check** compliance score and warnings
4. **Address** any validation errors

### Step 6: Save or Submit

**Options:**
- **Save as Draft**: Save for later editing
- **Finalize Invoice**: Lock the invoice (can't be edited)
- **Submit to MyInvois**: Send to LHDN system (for registered users)

---

## Managing Buyers

### Adding New Buyers

**Individual Buyers:**
- **Name**: Full name
- **IC Number**: Identity card number
- **Email**: Contact email
- **Phone**: Contact number
- **Address**: Full address

**Business Buyers:**
- **Company Name**: Registered business name
- **TIN Number**: Malaysian TIN
- **Business Type**: Sdn Bhd, Partnership, etc.
- **Industry Code**: MSIC 2008 code
- **Contact Person**: Primary contact
- **Address**: Business address

### Buyer Management Features

**Import Buyers:**
1. **Download** the CSV template
2. **Fill** in buyer information
3. **Upload** the completed file
4. **Review** and confirm import

**Export Buyers:**
- **CSV Format**: For spreadsheet use
- **PDF Format**: For printing
- **JSON Format**: For system integration

**Bulk Operations:**
- Update multiple buyer records
- Merge duplicate entries
- Mass email communications

---

## Invoice Templates

### Creating Templates

Templates save time by pre-filling common invoice information.

**Template Information:**
- **Template Name**: Descriptive name
- **Description**: What this template is for
- **Default Currency**: Usually MYR
- **Payment Terms**: Your standard terms

**Line Item Templates:**
- **Service Templates**: Common services you provide
- **Product Templates**: Products you regularly sell
- **Mixed Templates**: Combination of services and products

### Using Templates

1. **Create New Invoice**
2. **Select Template**: Choose from your saved templates
3. **Customize**: Modify as needed for specific buyer
4. **Add/Remove**: Line items as required

### Template Best Practices

✅ **Do:**
- Create templates for frequently used services
- Use clear, descriptive names
- Keep templates updated with current pricing
- Include SST rates for accuracy

❌ **Don't:**
- Use templates with outdated pricing
- Create too many similar templates
- Include buyer-specific information in templates

---

## Bulk Operations

### CSV Import

**Preparing Your CSV:**
1. **Download** the template from the import page
2. **Fill** in your data following the format
3. **Validate** data before upload
4. **Check** for formatting errors

**Import Process:**
1. **Choose File**: Select your CSV file
2. **Map Fields**: Confirm field mappings
3. **Preview**: Review first 5 records
4. **Import**: Start the import process
5. **Review Results**: Check for errors

**Common Import Issues:**
- **Invalid TIN formats**: Must follow Malaysian standards
- **Missing required fields**: All mandatory fields must be filled
- **Date formats**: Use YYYY-MM-DD format
- **Currency amounts**: Use decimal format (e.g., 1000.50)

### Batch Invoice Creation

Create multiple invoices from a single template:

1. **Select Template**: Choose your base template
2. **Upload Buyer List**: CSV file with buyer information
3. **Customize**: Adjust amounts/descriptions per buyer
4. **Generate**: Create all invoices at once
5. **Review**: Check each invoice before finalizing

---

## Malaysian Compliance

### Understanding Compliance Score

Your compliance score (0-100%) indicates how well your invoice meets Malaysian standards:

- **90-100%**: ✅ Excellent - Fully compliant
- **70-89%**: ⚠️ Good - Minor warnings
- **50-69%**: ⚠️ Fair - Some issues to address
- **Below 50%**: ❌ Poor - Major compliance problems

### Common Validation Rules

#### MY-001: TIN Format Validation
**Corporate TINs:** Start with 'C' followed by 10 digits (e.g., C1234567890)
**Individual TINs:** 12 digits (e.g., 123456789012)
**Government TINs:** Start with 'G' followed by 10 digits
**Non-profit TINs:** Start with 'N' followed by 10 digits

#### MY-002: Industry Code Validation
Must use valid MSIC 2008 codes:
- **62010**: Computer Programming
- **69201**: Accounting Services
- **46900**: General Trading
- **47911**: Retail Sale via Internet

#### MY-003: SST Calculation
- **Standard Rate**: 6% for most taxable goods/services
- **Exempt Items**: Medical services, education, basic food items
- **Zero-rated Items**: Exports, certain financial services

#### MY-004: Currency and Exchange Rates
- **MYR Invoices**: No exchange rate required
- **Foreign Currency**: Must include MYR equivalent
- **Exchange Rate Source**: Use Bank Negara Malaysia rates

### B2C Consolidation Rules

**Prohibited Industries** (cannot consolidate B2C invoices):
- Electric power generation/distribution
- Water supply services
- Telecommunications
- Parking and toll road services
- Public administration

**Consolidation Requirements:**
- Maximum monthly consolidation
- Must maintain individual transaction records
- Separate reporting for different service types

---

## Reports and Analytics

### Invoice Reports

**Invoice Summary:**
- Total invoices created
- Total revenue (by period)
- Average invoice value
- Payment status overview

**Compliance Reports:**
- Validation score trends
- Common compliance issues
- Resolution tracking
- Improvement recommendations

**Tax Reports:**
- SST collected summary
- SST by rate and period
- Tax liability calculations
- Government submission reports

### Dashboard Analytics

**Key Metrics:**
- Monthly recurring revenue
- Invoice processing times
- Buyer payment patterns
- Seasonal trends

**Visual Reports:**
- Revenue charts
- Compliance trends
- Geographic distribution
- Industry comparisons

### Custom Reports

Create custom reports with:
- **Date Range Selection**: Any period
- **Buyer Filtering**: Specific customers
- **Status Filtering**: Draft, sent, paid, overdue
- **Export Options**: PDF, Excel, CSV

---

## Troubleshooting

### Common Issues

#### Login Problems

**Issue**: Magic link not received
**Solutions:**
1. Check spam/junk folders
2. Add noreply@yourdomain.com to contacts
3. Try different email address
4. Contact support if problem persists

**Issue**: Magic link expired
**Solutions:**
1. Request new magic link
2. Complete verification within 15 minutes
3. Clear browser cache if needed

#### Invoice Creation Issues

**Issue**: TIN validation fails
**Solutions:**
1. Verify TIN format (C1234567890 for companies)
2. Check with SSM for correct TIN
3. Contact LHDN for TIN verification

**Issue**: SST calculation incorrect
**Solutions:**
1. Verify SST rate (usually 6%)
2. Check if item is SST-exempt
3. Review SST registration status

**Issue**: Industry code not accepted
**Solutions:**
1. Use MSIC 2008 codes only
2. Verify code with SSM database
3. Contact support for code verification

#### Import Problems

**Issue**: CSV import fails
**Solutions:**
1. Use provided CSV template
2. Check file encoding (UTF-8)
3. Verify all required fields are filled
4. Check date formats (YYYY-MM-DD)
5. Ensure numeric fields use correct format

**Issue**: Validation errors after import
**Solutions:**
1. Review validation report
2. Fix data in original CSV
3. Re-import corrected data
4. Use bulk edit to fix minor issues

### Performance Issues

**Issue**: Slow loading times
**Solutions:**
1. Clear browser cache and cookies
2. Disable browser extensions
3. Use supported browsers (Chrome, Firefox, Safari)
4. Check internet connection speed

**Issue**: Large file uploads timeout
**Solutions:**
1. Split large files into smaller batches
2. Use wired internet connection
3. Close other browser tabs/applications
4. Try upload during off-peak hours

### Getting Help

**Support Channels:**
- **Help Center**: [help.yourdomain.com](https://help.yourdomain.com)
- **Email Support**: [support@yourdomain.com](mailto:support@yourdomain.com)
- **Phone Support**: +60 3-1234-5678 (9 AM - 6 PM, Mon-Fri)
- **Live Chat**: Available in the application
- **Community Forum**: [community.yourdomain.com](https://community.yourdomain.com)

**When Contacting Support:**
1. **Describe** the problem clearly
2. **Include** error messages (if any)
3. **Provide** steps to reproduce the issue
4. **Attach** screenshots if helpful
5. **Mention** your browser and operating system

### Emergency Support

For critical issues affecting business operations:
- **Emergency Hotline**: +60 3-9999-0000 (24/7)
- **Priority Email**: emergency@yourdomain.com
- **Expected Response**: Within 2 hours

---

## Best Practices

### Invoice Management
1. **Regular Backups**: Export your data monthly
2. **Template Maintenance**: Keep templates updated
3. **Buyer Database**: Maintain accurate buyer information
4. **Compliance Monitoring**: Review validation scores regularly
5. **Payment Tracking**: Monitor payment status and follow up

### Data Security
1. **Strong Passwords**: Use unique, complex passwords
2. **Two-Factor Authentication**: Enable for extra security
3. **Access Control**: Limit user permissions appropriately
4. **Regular Reviews**: Audit user access quarterly
5. **Data Privacy**: Follow PDPA guidelines for customer data

### Compliance Management
1. **Stay Updated**: Monitor LHDN guideline changes
2. **Regular Validation**: Run compliance checks monthly
3. **Documentation**: Keep records for 7 years minimum
4. **Professional Advice**: Consult tax professionals when needed
5. **Training**: Keep staff updated on compliance requirements

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Create New Invoice | Ctrl + N | Cmd + N |
| Save Invoice | Ctrl + S | Cmd + S |
| Search | Ctrl + F | Cmd + F |
| Navigate to Dashboard | Ctrl + H | Cmd + H |
| Open Help | F1 | F1 |
| Print/Export | Ctrl + P | Cmd + P |
| Undo | Ctrl + Z | Cmd + Z |
| Redo | Ctrl + Y | Cmd + Y |

---

## Glossary

**B2B**: Business-to-Business transactions
**B2C**: Business-to-Consumer transactions
**LHDN**: Lembaga Hasil Dalam Negeri (Inland Revenue Board)
**MSIC**: Malaysia Standard Industrial Classification
**MyInvois**: LHDN's official e-Invoice portal
**PDPA**: Personal Data Protection Act
**SSM**: Suruhanjaya Syarikat Malaysia (Companies Commission)
**SST**: Sales and Service Tax
**TIN**: Tax Identification Number

---

*Need more help? Contact our support team at [support@yourdomain.com](mailto:support@yourdomain.com) or visit our [Help Center](https://help.yourdomain.com).*

*Last updated: January 2024*