// Easy e-Invoice Notification Package
// Email and notification service with Malaysian business context
export * from './types';
export * from './service';
export * from './templates';
// Re-export commonly used types
export { NotificationType, NotificationPriority, Language, NotificationError, TemplateNotFoundError, RecipientNotFoundError, DeliveryFailedError, RateLimitExceededError, DEFAULT_NOTIFICATION_PREFERENCES, MALAYSIAN_LOCALIZATION } from './types';
// Re-export main service
export { EasyInvoiceNotificationService } from './service';
// Re-export template utilities
export { EMAIL_TEMPLATES, getEmailTemplate, getAllTemplateIds, getTemplateSupportedLanguages } from './templates';
// Factory function to create notification service
export const createNotificationService = (config, storage) => {
    return new EasyInvoiceNotificationService(config, storage);
};
// Helper functions for creating notifications
export const createJobCompletionNotification = (recipient, organizationId, jobData) => {
    const notificationType = jobData.status === 'completed'
        ? NotificationType.JOB_COMPLETED
        : NotificationType.JOB_FAILED;
    const priority = jobData.status === 'failed'
        ? NotificationPriority.HIGH
        : NotificationPriority.MEDIUM;
    return {
        id: uuidv4(),
        type: notificationType,
        priority,
        recipient,
        organizationId,
        title: `Job ${jobData.status === 'completed' ? 'Completed' : 'Failed'}: ${jobData.jobType}`,
        message: jobData.status === 'completed'
            ? `Your ${jobData.jobType} job completed successfully. Processed ${jobData.statistics.processed} items.`
            : `Your ${jobData.jobType} job failed. ${jobData.errorMessage || 'Please check the job details.'}`,
        data: {
            job_id: jobData.jobId,
            job_type: jobData.jobType,
            completion_time: formatMalaysianDateTime(jobData.endTime),
            duration: formatDuration(jobData.duration),
            items_processed: jobData.statistics.processed,
            successful_items: jobData.statistics.successful,
            failed_items: jobData.statistics.failed,
            skipped_items: jobData.statistics.skipped,
            dashboard_url: `https://easyeinvoice.com.my/jobs/${jobData.jobId}`
        },
        channels: ['email'],
        createdAt: new Date(),
        businessContext: {
            complianceRelated: false,
            urgencyLevel: jobData.status === 'failed' ? 'important' : 'routine'
        }
    };
};
export const createCsvImportNotification = (recipient, organizationId, fileName, results) => {
    return {
        id: uuidv4(),
        type: NotificationType.CSV_IMPORT_COMPLETE,
        priority: NotificationPriority.MEDIUM,
        recipient,
        organizationId,
        title: `CSV Import Completed: ${fileName}`,
        message: `Your CSV file has been imported successfully. ${results.successfulRecords} records imported, ${results.failedRecords} failed.`,
        data: {
            file_name: fileName,
            total_records: results.totalRecords,
            successful_records: results.successfulRecords,
            failed_records: results.failedRecords,
            dashboard_url: 'https://easyeinvoice.com.my/invoices',
            report_url: results.reportUrl
        },
        channels: ['email'],
        createdAt: new Date(),
        businessContext: {
            complianceRelated: true,
            urgencyLevel: results.failedRecords > 0 ? 'important' : 'routine'
        }
    };
};
export const createMyInvoisNotification = (recipient, organizationId, myInvoisData) => {
    const isSuccess = myInvoisData.status === 'accepted' || myInvoisData.status === 'submitted';
    return {
        id: uuidv4(),
        type: isSuccess ? NotificationType.MYINVOIS_SUBMISSION_SUCCESS : NotificationType.MYINVOIS_SUBMISSION_FAILED,
        priority: isSuccess ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
        recipient,
        organizationId,
        title: `MyInvois Submission ${isSuccess ? 'Successful' : 'Failed'}`,
        message: isSuccess
            ? `Your invoices have been successfully submitted to MyInvois portal.`
            : `MyInvois submission failed. Please review and resubmit.`,
        data: {
            submission_id: myInvoisData.submissionId,
            reference_number: myInvoisData.referenceNumber,
            invoice_count: myInvoisData.invoiceIds.length,
            status: myInvoisData.status,
            submission_time: formatMalaysianDateTime(myInvoisData.submissionTime),
            response_time: myInvoisData.responseTime ? formatMalaysianDateTime(myInvoisData.responseTime) : '',
            dashboard_url: 'https://easyeinvoice.com.my/myinvois',
            myinvois_portal_url: 'https://myinvois.hasil.gov.my'
        },
        channels: ['email'],
        createdAt: new Date(),
        businessContext: {
            complianceRelated: true,
            invoiceIds: myInvoisData.invoiceIds,
            urgencyLevel: isSuccess ? 'routine' : 'urgent'
        }
    };
};
export const createComplianceAlert = (recipient, organizationId, complianceData) => {
    const priorityMap = {
        low: NotificationPriority.LOW,
        medium: NotificationPriority.MEDIUM,
        high: NotificationPriority.HIGH,
        critical: NotificationPriority.CRITICAL
    };
    return {
        id: uuidv4(),
        type: NotificationType.COMPLIANCE_SCORE_LOW,
        priority: priorityMap[complianceData.severity],
        recipient,
        organizationId,
        title: 'Compliance Alert - Action Required',
        message: `Compliance issues detected. ${complianceData.recommendedActions.length} actions recommended.`,
        data: {
            alert_type: complianceData.alertType,
            severity: complianceData.severity,
            compliance_score: complianceData.complianceScore,
            affected_invoices: complianceData.affectedInvoices?.length || 0,
            deadline: complianceData.deadline ? formatMalaysianDateTime(complianceData.deadline) : '',
            recommended_actions: complianceData.recommendedActions,
            compliance_dashboard_url: 'https://easyeinvoice.com.my/compliance'
        },
        channels: ['email'],
        createdAt: new Date(),
        businessContext: {
            complianceRelated: true,
            invoiceIds: complianceData.affectedInvoices,
            regulationReference: complianceData.regulationTitle,
            urgencyLevel: complianceData.severity === 'critical' ? 'critical' :
                complianceData.severity === 'high' ? 'urgent' : 'important'
        }
    };
};
export const createWelcomeNotification = (recipient, organizationId) => {
    return {
        id: uuidv4(),
        type: NotificationType.ACCOUNT_WELCOME,
        priority: NotificationPriority.MEDIUM,
        recipient,
        organizationId,
        title: 'Welcome to Easy e-Invoice!',
        message: 'Get started with Malaysian e-Invoice compliance in just a few minutes.',
        data: {
            user_name: recipient.name,
            dashboard_url: 'https://easyeinvoice.com.my/dashboard',
            setup_url: 'https://easyeinvoice.com.my/setup',
            support_url: 'https://easyeinvoice.com.my/support',
            documentation_url: 'https://easyeinvoice.com.my/docs'
        },
        channels: ['email'],
        createdAt: new Date(),
        businessContext: {
            complianceRelated: false,
            urgencyLevel: 'routine'
        }
    };
};
// Utility functions
export const formatMalaysianDateTime = (date) => {
    return date.toLocaleString('en-MY', {
        timeZone: MALAYSIAN_LOCALIZATION.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
export const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    else {
        return `${seconds}s`;
    }
};
export const getMalaysianBusinessHours = () => {
    return MALAYSIAN_LOCALIZATION.businessHours;
};
export const isWithinMalaysianBusinessHours = (date = new Date()) => {
    const malaysianTime = new Date(date.toLocaleString('en-US', {
        timeZone: MALAYSIAN_LOCALIZATION.timezone
    }));
    const hours = malaysianTime.getHours();
    const day = malaysianTime.getDay();
    return MALAYSIAN_LOCALIZATION.workingDays.includes(day) &&
        hours >= MALAYSIAN_LOCALIZATION.businessHours.start &&
        hours < MALAYSIAN_LOCALIZATION.businessHours.end;
};
export const getNextMalaysianBusinessDay = (date = new Date()) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    while (!MALAYSIAN_LOCALIZATION.workingDays.includes(nextDay.getDay())) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    nextDay.setHours(MALAYSIAN_LOCALIZATION.businessHours.start, 0, 0, 0);
    return nextDay;
};
// Notification validation helpers
export const validateNotificationPayload = (payload) => {
    try {
        // Basic validation
        if (!payload.id || !payload.type || !payload.recipient || !payload.organizationId) {
            return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.recipient.email)) {
            return false;
        }
        // Channel validation
        if (!payload.channels || payload.channels.length === 0) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
};
export const shouldSendNotification = (payload, preferences) => {
    // Check if email notifications are enabled
    if (payload.channels.includes('email') && !preferences?.emailNotifications) {
        return false;
    }
    // Check specific notification type preferences
    switch (payload.type) {
        case NotificationType.WEEKLY_SUMMARY:
        case NotificationType.MONTHLY_REPORT:
            return preferences?.weeklyReports !== false;
        case NotificationType.COMPLIANCE_SCORE_LOW:
        case NotificationType.VALIDATION_FAILED:
            return preferences?.complianceAlerts !== false;
        default:
            return true;
    }
};
// Default export
export default {
    createNotificationService,
    createJobCompletionNotification,
    createCsvImportNotification,
    createMyInvoisNotification,
    createComplianceAlert,
    createWelcomeNotification,
    formatMalaysianDateTime,
    formatDuration,
    getMalaysianBusinessHours,
    isWithinMalaysianBusinessHours,
    getNextMalaysianBusinessDay,
    validateNotificationPayload,
    shouldSendNotification
};
// Import uuid for ID generation
import { v4 as uuidv4 } from 'uuid';
import { MALAYSIAN_LOCALIZATION } from './types';
