// MyInvois Submission Job Processor for Easy e-Invoice
// Handles submission of invoices to Malaysian MyInvois portal

import { JobProcessor, Job, JobResult, MyInvoisSubmissionPayload } from '../types';

export class MyInvoisProcessor implements JobProcessor {
  constructor(
    private database: any, // Database connection
    private myInvoisClient: MyInvoisClient,
    private notificationService: any
  ) {}

  async process(job: Job): Promise<JobResult> {
    const payload = job.payload as MyInvoisSubmissionPayload;
    
    try {
      // Step 1: Retrieve and validate invoices
      await this.updateProgress(job, 10, 'Retrieving invoices');
      const invoices = await this.getInvoices(payload.invoiceIds);
      
      await this.updateProgress(job, 20, 'Validating invoice compliance');
      const validationResults = await this.validateInvoicesForSubmission(invoices);
      
      if (validationResults.blockers.length > 0) {
        throw new Error(`Submission blocked: ${validationResults.blockers.join(', ')}`);
      }
      
      // Step 2: Prepare submission data
      await this.updateProgress(job, 30, 'Preparing submission data');
      const submissionData = await this.prepareSubmissionData(invoices, payload);
      
      // Step 3: Submit to MyInvois
      await this.updateProgress(job, 50, 'Submitting to MyInvois portal');
      const submissionResults = await this.submitToMyInvois(submissionData, payload);
      
      // Step 4: Process results and update database
      await this.updateProgress(job, 80, 'Processing submission results');
      await this.processSubmissionResults(submissionResults, invoices);
      
      // Step 5: Send notifications
      await this.updateProgress(job, 95, 'Sending notifications');
      await this.sendNotifications(payload, submissionResults);
      
      await this.updateProgress(job, 100, 'Submission completed');
      
      return {
        success: true,
        data: {
          submittedInvoices: submissionResults.successful.length,
          failedInvoices: submissionResults.failed.length,
          submissionId: submissionResults.submissionId,
          myInvoisReference: submissionResults.referenceNumber
        },
        statistics: {
          processed: invoices.length,
          successful: submissionResults.successful.length,
          failed: submissionResults.failed.length,
          skipped: submissionResults.skipped.length
        },
        warnings: validationResults.warnings
      };
      
    } catch (error) {
      // Handle submission failure
      await this.handleSubmissionFailure(payload, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during MyInvois submission',
        statistics: {
          processed: payload.invoiceIds.length,
          successful: 0,
          failed: payload.invoiceIds.length,
          skipped: 0
        }
      };
    }
  }

  async getEstimatedDuration(payload: MyInvoisSubmissionPayload): Promise<number> {
    // Base duration: 10 seconds per invoice
    let baseDuration = payload.invoiceIds.length * 10000;
    
    // Batch submissions are more efficient
    if (payload.submissionType === 'batch' && payload.invoiceIds.length > 10) {
      baseDuration *= 0.7; // 30% faster for batches
    }
    
    // Production environment may take longer due to validation
    if (payload.environment === 'production') {
      baseDuration *= 1.5;
    }
    
    // Minimum 30 seconds for API overhead
    return Math.max(30000, baseDuration);
  }

  async validatePayload(payload: unknown): Promise<boolean> {
    try {
      const myInvoisPayload = payload as MyInvoisSubmissionPayload;
      
      // Validate required fields
      if (!myInvoisPayload.invoiceIds || myInvoisPayload.invoiceIds.length === 0) {
        return false;
      }
      
      // Check invoice limits
      if (myInvoisPayload.submissionType === 'batch' && myInvoisPayload.invoiceIds.length > 100) {
        return false; // MyInvois batch limit
      }
      
      if (myInvoisPayload.submissionType === 'single' && myInvoisPayload.invoiceIds.length > 1) {
        return false;
      }
      
      // Validate invoices exist
      const invoices = await this.getInvoices(myInvoisPayload.invoiceIds);
      if (invoices.length !== myInvoisPayload.invoiceIds.length) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods
  private async getInvoices(invoiceIds: string[]): Promise<any[]> {
    // Retrieve invoices from database
    // This would integrate with the actual database
    return invoiceIds.map(id => ({
      id,
      number: `INV-${id.slice(0, 8)}`,
      amount: 1000,
      currency: 'MYR',
      customerTin: 'C1234567890',
      // ... other invoice fields
    }));
  }

  private async validateInvoicesForSubmission(invoices: any[]): Promise<{
    blockers: string[];
    warnings: string[];
  }> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    
    for (const invoice of invoices) {
      // Check compliance score
      if (invoice.complianceScore < 70) {
        blockers.push(`Invoice ${invoice.number}: Compliance score too low (${invoice.complianceScore}%)`);
      }
      
      // Check required fields for MyInvois
      if (!invoice.customerTin) {
        blockers.push(`Invoice ${invoice.number}: Customer TIN required for MyInvois submission`);
      }
      
      // Check if already submitted
      if (invoice.myInvoisStatus === 'submitted') {
        warnings.push(`Invoice ${invoice.number}: Already submitted to MyInvois`);
      }
      
      // Validate TIN format
      if (invoice.customerTin && !this.validateTinFormat(invoice.customerTin)) {
        blockers.push(`Invoice ${invoice.number}: Invalid TIN format`);
      }
      
      // Check amount limits
      if (invoice.amount > 1000000) { // RM 1M limit example
        warnings.push(`Invoice ${invoice.number}: High amount requires additional validation`);
      }
    }
    
    return { blockers, warnings };
  }

  private async prepareSubmissionData(invoices: any[], payload: MyInvoisSubmissionPayload): Promise<any> {
    const submissionData = {
      submissionType: payload.submissionType,
      environment: payload.environment,
      timestamp: new Date().toISOString(),
      organizationId: payload.organizationId,
      invoices: invoices.map(invoice => this.formatInvoiceForMyInvois(invoice))
    };
    
    return submissionData;
  }

  private formatInvoiceForMyInvois(invoice: any): any {
    return {
      invoiceNumber: invoice.number,
      invoiceDate: invoice.date,
      amount: invoice.amount,
      currency: invoice.currency,
      customerTin: invoice.customerTin,
      customerName: invoice.customerName,
      lineItems: invoice.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxRate: item.taxRate || 0.06 // 6% SST
      })) || [],
      // Malaysian specific fields
      sstAmount: invoice.sstAmount,
      totalAmount: invoice.totalAmount,
      exchangeRate: invoice.exchangeRate
    };
  }

  private async submitToMyInvois(submissionData: any, payload: MyInvoisSubmissionPayload): Promise<{
    submissionId: string;
    referenceNumber: string;
    successful: any[];
    failed: any[];
    skipped: any[];
  }> {
    try {
      if (payload.submissionType === 'batch') {
        return await this.myInvoisClient.submitBatch(submissionData);
      } else {
        return await this.myInvoisClient.submitSingle(submissionData);
      }
    } catch (error) {
      // Handle MyInvois API errors
      throw new Error(`MyInvois submission failed: ${error instanceof Error ? error.message : 'Unknown API error'}`);
    }
  }

  private async processSubmissionResults(results: any, invoices: any[]): Promise<void> {
    // Update database with submission results
    for (const result of results.successful) {
      await this.updateInvoiceStatus(result.invoiceId, 'submitted', {
        myInvoisReference: result.referenceNumber,
        submissionDate: new Date(),
        submissionId: results.submissionId
      });
    }
    
    for (const result of results.failed) {
      await this.updateInvoiceStatus(result.invoiceId, 'submission_failed', {
        error: result.error,
        submissionDate: new Date(),
        submissionId: results.submissionId
      });
    }
  }

  private async updateInvoiceStatus(invoiceId: string, status: string, metadata: any): Promise<void> {
    // Update invoice status in database
    console.log(`Updating invoice ${invoiceId} status to ${status}`, metadata);
  }

  private async sendNotifications(payload: MyInvoisSubmissionPayload, results: any): Promise<void> {
    // Send email notification to user
    const notificationData = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      type: 'myinvois_submission_complete',
      data: {
        totalInvoices: payload.invoiceIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        submissionId: results.submissionId,
        referenceNumber: results.referenceNumber
      }
    };
    
    await this.notificationService.send(notificationData);
  }

  private async handleSubmissionFailure(payload: MyInvoisSubmissionPayload, error: any): Promise<void> {
    // Mark all invoices as submission failed
    for (const invoiceId of payload.invoiceIds) {
      await this.updateInvoiceStatus(invoiceId, 'submission_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        submissionDate: new Date()
      });
    }
    
    // Send failure notification
    const notificationData = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      type: 'myinvois_submission_failed',
      data: {
        totalInvoices: payload.invoiceIds.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    await this.notificationService.send(notificationData);
  }

  private validateTinFormat(tin: string): boolean {
    // Malaysian TIN validation
    const corporateTinRegex = /^C\d{10}$/; // C1234567890
    const individualTinRegex = /^\d{12}$/;  // 123456789012
    
    return corporateTinRegex.test(tin) || individualTinRegex.test(tin);
  }

  private async updateProgress(job: Job, percentage: number, message: string): Promise<void> {
    // This would be called through the job queue to update progress
    console.log(`Job ${job.id}: ${percentage}% - ${message}`);
  }
}

// MyInvois API Client (mock implementation)
export class MyInvoisClient {
  constructor(
    private environment: 'sandbox' | 'production',
    private credentials: {
      clientId: string;
      clientSecret: string;
      apiKey: string;
    }
  ) {}

  async submitSingle(data: any): Promise<any> {
    // Mock single submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      submissionId: `single-${Date.now()}`,
      referenceNumber: `REF${Date.now()}`,
      successful: data.invoices.map((inv: any) => ({
        invoiceId: inv.invoiceNumber,
        referenceNumber: `REF${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      })),
      failed: [],
      skipped: []
    };
  }

  async submitBatch(data: any): Promise<any> {
    // Mock batch submission
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const successful = data.invoices.slice(0, Math.floor(data.invoices.length * 0.9));
    const failed = data.invoices.slice(successful.length);
    
    return {
      submissionId: `batch-${Date.now()}`,
      referenceNumber: `BATCH${Date.now()}`,
      successful: successful.map((inv: any) => ({
        invoiceId: inv.invoiceNumber,
        referenceNumber: `REF${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      })),
      failed: failed.map((inv: any) => ({
        invoiceId: inv.invoiceNumber,
        error: 'Validation error: Amount exceeds limit'
      })),
      skipped: []
    };
  }
}