// Malaysian e-Invoice Compliance Performance Monitoring
// This module provides comprehensive monitoring for Malaysian regulatory compliance

export interface MalaysianComplianceMetrics {
  // TIN Validation Metrics
  tinValidation: {
    totalValidations: number;
    validCount: number;
    invalidCount: number;
    formatErrors: number;
    performanceMs: number;
    validationsPerSecond: number;
  };
  
  // SST Calculation Metrics
  sstCalculation: {
    totalCalculations: number;
    correctCalculations: number;
    errors: number;
    totalSstAmount: number;
    averageCalculationTime: number;
    calculationsPerSecond: number;
  };
  
  // Industry Consolidation Compliance
  industryConsolidation: {
    totalChecks: number;
    allowedConsolidations: number;
    blockedConsolidations: number;
    prohibitedIndustries: string[];
    complianceRate: number;
  };
  
  // PDPA Compliance Metrics
  pdpaCompliance: {
    dataProcessingEvents: number;
    consentRecorded: number;
    dataRetentionCompliant: number;
    violations: number;
    complianceScore: number;
  };
  
  // MyInvois Integration Metrics
  myinvoisIntegration: {
    submissionsAttempted: number;
    submissionsSuccessful: number;
    submissionsFailed: number;
    averageResponseTime: number;
    formatValidationErrors: number;
    successRate: number;
  };
  
  // Business Operations Metrics
  businessMetrics: {
    invoicesProcessed: number;
    averageProcessingTime: number;
    peakProcessingHour: number;
    businessHoursActivity: number;
    nonBusinessHoursActivity: number;
    malaysianTimezoneCompliance: boolean;
  };
  
  // Overall Compliance Score
  overallCompliance: {
    score: number; // 0-100
    status: 'compliant' | 'warning' | 'critical';
    lastAssessment: string;
    criticalIssues: string[];
    recommendations: string[];
  };
}

export class MalaysianComplianceMonitor {
  private metrics: MalaysianComplianceMetrics;
  private startTime: number;
  
  constructor() {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }
  
  private initializeMetrics(): MalaysianComplianceMetrics {
    return {
      tinValidation: {
        totalValidations: 0,
        validCount: 0,
        invalidCount: 0,
        formatErrors: 0,
        performanceMs: 0,
        validationsPerSecond: 0,
      },
      sstCalculation: {
        totalCalculations: 0,
        correctCalculations: 0,
        errors: 0,
        totalSstAmount: 0,
        averageCalculationTime: 0,
        calculationsPerSecond: 0,
      },
      industryConsolidation: {
        totalChecks: 0,
        allowedConsolidations: 0,
        blockedConsolidations: 0,
        prohibitedIndustries: ['35101', '35102', '35103', '36000', '37000', '61', '52211', '52212', '84'],
        complianceRate: 100,
      },
      pdpaCompliance: {
        dataProcessingEvents: 0,
        consentRecorded: 0,
        dataRetentionCompliant: 0,
        violations: 0,
        complianceScore: 100,
      },
      myinvoisIntegration: {
        submissionsAttempted: 0,
        submissionsSuccessful: 0,
        submissionsFailed: 0,
        averageResponseTime: 0,
        formatValidationErrors: 0,
        successRate: 0,
      },
      businessMetrics: {
        invoicesProcessed: 0,
        averageProcessingTime: 0,
        peakProcessingHour: 0,
        businessHoursActivity: 0,
        nonBusinessHoursActivity: 0,
        malaysianTimezoneCompliance: true,
      },
      overallCompliance: {
        score: 100,
        status: 'compliant',
        lastAssessment: new Date().toISOString(),
        criticalIssues: [],
        recommendations: [],
      },
    };
  }
  
  // TIN Validation Monitoring
  recordTinValidation(tin: string, isValid: boolean, processingTime: number): void {
    const start = Date.now();
    
    this.metrics.tinValidation.totalValidations++;
    this.metrics.tinValidation.performanceMs += processingTime;
    
    if (isValid) {
      this.metrics.tinValidation.validCount++;
    } else {
      this.metrics.tinValidation.invalidCount++;
      
      // Check if it's a format error (Malaysian TIN patterns)
      const malaysianTinPattern = /^[CG]\\d{10}$|^\\d{12}$/;
      if (!malaysianTinPattern.test(tin)) {
        this.metrics.tinValidation.formatErrors++;
      }
    }
    
    // Calculate performance metrics
    this.metrics.tinValidation.validationsPerSecond = 
      this.metrics.tinValidation.totalValidations / ((Date.now() - this.startTime) / 1000);
    
    this.updateOverallCompliance();
  }
  
  // SST Calculation Monitoring
  recordSstCalculation(amount: number, sstRate: number, calculatedSst: number, expectedSst: number, processingTime: number): void {
    this.metrics.sstCalculation.totalCalculations++;
    this.metrics.sstCalculation.totalSstAmount += calculatedSst;
    
    // Check if calculation is correct (6% SST rate for Malaysia)
    const tolerance = 0.01; // 1 sen tolerance
    if (Math.abs(calculatedSst - expectedSst) <= tolerance && sstRate === 6.0) {
      this.metrics.sstCalculation.correctCalculations++;
    } else {
      this.metrics.sstCalculation.errors++;
    }
    
    // Update performance metrics
    this.metrics.sstCalculation.averageCalculationTime = 
      (this.metrics.sstCalculation.averageCalculationTime + processingTime) / 2;
    
    this.metrics.sstCalculation.calculationsPerSecond = 
      this.metrics.sstCalculation.totalCalculations / ((Date.now() - this.startTime) / 1000);
    
    this.updateOverallCompliance();
  }
  
  // Industry Consolidation Monitoring
  recordConsolidationCheck(industryCode: string, isConsolidated: boolean, allowed: boolean): void {
    this.metrics.industryConsolidation.totalChecks++;
    
    if (isConsolidated) {
      if (allowed) {
        this.metrics.industryConsolidation.allowedConsolidations++;
      } else {
        this.metrics.industryConsolidation.blockedConsolidations++;
        // Log prohibited industry violation
        console.warn(`🚫 B2C Consolidation blocked for prohibited industry: ${industryCode}`);
      }
    }
    
    // Calculate compliance rate
    this.metrics.industryConsolidation.complianceRate = 
      (this.metrics.industryConsolidation.allowedConsolidations / 
       Math.max(1, this.metrics.industryConsolidation.allowedConsolidations + this.metrics.industryConsolidation.blockedConsolidations)) * 100;
    
    this.updateOverallCompliance();
  }
  
  // PDPA Compliance Monitoring
  recordDataProcessingEvent(eventType: 'consent' | 'retention' | 'processing' | 'violation'): void {
    this.metrics.pdpaCompliance.dataProcessingEvents++;
    
    switch (eventType) {
      case 'consent':
        this.metrics.pdpaCompliance.consentRecorded++;
        break;
      case 'retention':
        this.metrics.pdpaCompliance.dataRetentionCompliant++;
        break;
      case 'violation':
        this.metrics.pdpaCompliance.violations++;
        console.error('🚨 PDPA Compliance Violation Detected');
        break;
    }
    
    // Calculate compliance score
    const totalEvents = this.metrics.pdpaCompliance.dataProcessingEvents;
    const violations = this.metrics.pdpaCompliance.violations;
    this.metrics.pdpaCompliance.complianceScore = Math.max(0, ((totalEvents - violations) / totalEvents) * 100);
    
    this.updateOverallCompliance();
  }
  
  // MyInvois Integration Monitoring
  recordMyInvoisSubmission(success: boolean, responseTime: number, formatValid: boolean): void {
    this.metrics.myinvoisIntegration.submissionsAttempted++;
    
    if (success) {
      this.metrics.myinvoisIntegration.submissionsSuccessful++;
    } else {
      this.metrics.myinvoisIntegration.submissionsFailed++;
    }
    
    if (!formatValid) {
      this.metrics.myinvoisIntegration.formatValidationErrors++;
    }
    
    // Update average response time
    this.metrics.myinvoisIntegration.averageResponseTime = 
      (this.metrics.myinvoisIntegration.averageResponseTime + responseTime) / 2;
    
    // Calculate success rate
    this.metrics.myinvoisIntegration.successRate = 
      (this.metrics.myinvoisIntegration.submissionsSuccessful / this.metrics.myinvoisIntegration.submissionsAttempted) * 100;
    
    this.updateOverallCompliance();
  }
  
  // Business Operations Monitoring
  recordInvoiceProcessing(processingTime: number): void {
    this.metrics.businessMetrics.invoicesProcessed++;
    
    // Update average processing time
    this.metrics.businessMetrics.averageProcessingTime = 
      (this.metrics.businessMetrics.averageProcessingTime + processingTime) / 2;
    
    // Check if processing during Malaysian business hours (9 AM - 5 PM MYT)
    const malaysianTime = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const hour = new Date(malaysianTime).getHours();
    
    if (hour >= 9 && hour <= 17) {
      this.metrics.businessMetrics.businessHoursActivity++;
    } else {
      this.metrics.businessMetrics.nonBusinessHoursActivity++;
    }
    
    // Track peak processing hour
    this.metrics.businessMetrics.peakProcessingHour = hour;
    
    this.updateOverallCompliance();
  }
  
  // Update overall compliance score
  private updateOverallCompliance(): void {
    const scores = [
      // TIN validation compliance (90% valid rate target)
      (this.metrics.tinValidation.validCount / Math.max(1, this.metrics.tinValidation.totalValidations)) * 100,
      
      // SST calculation compliance (95% accuracy target)
      (this.metrics.sstCalculation.correctCalculations / Math.max(1, this.metrics.sstCalculation.totalCalculations)) * 100,
      
      // Industry consolidation compliance
      this.metrics.industryConsolidation.complianceRate,
      
      // PDPA compliance
      this.metrics.pdpaCompliance.complianceScore,
      
      // MyInvois integration success rate
      this.metrics.myinvoisIntegration.successRate || 100, // Default to 100 if no submissions yet
    ];
    
    // Calculate weighted average (all equally important for Malaysian compliance)\n    this.metrics.overallCompliance.score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    \n    // Determine compliance status\n    if (this.metrics.overallCompliance.score >= 95) {\n      this.metrics.overallCompliance.status = 'compliant';\n    } else if (this.metrics.overallCompliance.score >= 80) {\n      this.metrics.overallCompliance.status = 'warning';\n    } else {\n      this.metrics.overallCompliance.status = 'critical';\n    }\n    \n    this.metrics.overallCompliance.lastAssessment = new Date().toISOString();\n    this.updateRecommendations();\n  }\n  \n  // Generate compliance recommendations\n  private updateRecommendations(): void {\n    const recommendations: string[] = [];\n    const criticalIssues: string[] = [];\n    \n    // TIN validation recommendations\n    const tinAccuracy = (this.metrics.tinValidation.validCount / Math.max(1, this.metrics.tinValidation.totalValidations)) * 100;\n    if (tinAccuracy < 90) {\n      recommendations.push('Improve TIN validation accuracy - currently below 90% target');\n      if (tinAccuracy < 70) {\n        criticalIssues.push('TIN validation accuracy critically low');\n      }\n    }\n    \n    // SST calculation recommendations\n    const sstAccuracy = (this.metrics.sstCalculation.correctCalculations / Math.max(1, this.metrics.sstCalculation.totalCalculations)) * 100;\n    if (sstAccuracy < 95) {\n      recommendations.push('Review SST calculation logic - must maintain 95% accuracy for Malaysian compliance');\n      if (sstAccuracy < 85) {\n        criticalIssues.push('SST calculation accuracy below regulatory requirements');\n      }\n    }\n    \n    // PDPA compliance recommendations\n    if (this.metrics.pdpaCompliance.violations > 0) {\n      criticalIssues.push(`${this.metrics.pdpaCompliance.violations} PDPA violations detected`);\n      recommendations.push('Address PDPA compliance violations immediately');\n    }\n    \n    // MyInvois integration recommendations\n    if (this.metrics.myinvoisIntegration.successRate < 90) {\n      recommendations.push('Improve MyInvois integration reliability');\n      if (this.metrics.myinvoisIntegration.successRate < 70) {\n        criticalIssues.push('MyInvois integration failure rate too high');\n      }\n    }\n    \n    // Performance recommendations\n    if (this.metrics.businessMetrics.averageProcessingTime > 5000) { // 5 seconds\n      recommendations.push('Optimize invoice processing performance for better user experience');\n    }\n    \n    this.metrics.overallCompliance.criticalIssues = criticalIssues;\n    this.metrics.overallCompliance.recommendations = recommendations;\n  }\n  \n  // Get current metrics\n  getMetrics(): MalaysianComplianceMetrics {\n    return { ...this.metrics };\n  }\n  \n  // Get compliance summary for reporting\n  getComplianceSummary() {\n    return {\n      overallScore: this.metrics.overallCompliance.score,\n      status: this.metrics.overallCompliance.status,\n      criticalIssues: this.metrics.overallCompliance.criticalIssues,\n      recommendations: this.metrics.overallCompliance.recommendations,\n      keyMetrics: {\n        tinValidationRate: `${((this.metrics.tinValidation.validCount / Math.max(1, this.metrics.tinValidation.totalValidations)) * 100).toFixed(1)}%`,\n        sstAccuracy: `${((this.metrics.sstCalculation.correctCalculations / Math.max(1, this.metrics.sstCalculation.totalCalculations)) * 100).toFixed(1)}%`,\n        myinvoisSuccessRate: `${this.metrics.myinvoisIntegration.successRate.toFixed(1)}%`,\n        pdpaViolations: this.metrics.pdpaCompliance.violations,\n        totalInvoicesProcessed: this.metrics.businessMetrics.invoicesProcessed,\n      },\n      lastAssessment: this.metrics.overallCompliance.lastAssessment,\n    };\n  }\n  \n  // Export metrics for external monitoring systems\n  exportForMonitoring() {\n    return {\n      timestamp: new Date().toISOString(),\n      system: 'malaysian-einvoice-compliance',\n      metrics: this.getMetrics(),\n      alerts: {\n        critical: this.metrics.overallCompliance.criticalIssues,\n        warnings: this.metrics.overallCompliance.recommendations,\n      },\n    };\n  }\n}\n\n// Global compliance monitor instance\nexport const complianceMonitor = new MalaysianComplianceMonitor();\n\n// Utility functions for easy integration\nexport const recordTinValidation = (tin: string, isValid: boolean, processingTime: number = 0) => \n  complianceMonitor.recordTinValidation(tin, isValid, processingTime);\n\nexport const recordSstCalculation = (amount: number, sstRate: number, calculatedSst: number, expectedSst: number, processingTime: number = 0) => \n  complianceMonitor.recordSstCalculation(amount, sstRate, calculatedSst, expectedSst, processingTime);\n\nexport const recordConsolidationCheck = (industryCode: string, isConsolidated: boolean, allowed: boolean) => \n  complianceMonitor.recordConsolidationCheck(industryCode, isConsolidated, allowed);\n\nexport const recordDataProcessingEvent = (eventType: 'consent' | 'retention' | 'processing' | 'violation') => \n  complianceMonitor.recordDataProcessingEvent(eventType);\n\nexport const recordMyInvoisSubmission = (success: boolean, responseTime: number, formatValid: boolean) => \n  complianceMonitor.recordMyInvoisSubmission(success, responseTime, formatValid);\n\nexport const recordInvoiceProcessing = (processingTime: number) => \n  complianceMonitor.recordInvoiceProcessing(processingTime);\n\nexport const getComplianceReport = () => complianceMonitor.getComplianceSummary();