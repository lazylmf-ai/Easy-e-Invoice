// Notification Service Implementation for Easy e-Invoice
// Email notification service with Malaysian business context using Resend
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import { Language, NotificationType, NotificationPriority, TemplateNotFoundError, MALAYSIAN_LOCALIZATION } from './types';
export class EasyInvoiceNotificationService {
    config;
    storage;
    resend;
    templates = new Map();
    deliveryStats = {
        sent: 0,
        delivered: 0,
        failed: 0,
        byType: new Map(),
        byPriority: new Map()
    };
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
        this.resend = new Resend(config.apiKey);
        this.loadDefaultTemplates();
    }
    async send(notification) {
        try {
            // Check if user wants email notifications
            if (!notification.recipient.preferences?.emailNotifications) {
                return {
                    id: notification.id,
                    success: false,
                    error: 'Recipient has disabled email notifications',
                    deliveryChannel: 'email',
                    timestamp: new Date()
                };
            }
            // Get or create template
            const template = await this.getOrCreateTemplate(notification);
            // Prepare email content
            const emailContent = await this.prepareEmailContent(notification, template);
            // Check Malaysian business context for timing
            const businessContext = this.getMalaysianBusinessContext();
            const shouldDelay = this.shouldDelayNotification(notification, businessContext);
            if (shouldDelay) {
                // Schedule for next business day
                await this.scheduleForNextBusinessDay(notification);
                return {
                    id: notification.id,
                    success: true,
                    deliveryChannel: 'email',
                    timestamp: new Date(),
                    messageId: `scheduled-${notification.id}`
                };
            }
            // Send email via Resend
            const result = await this.resend.emails.send({
                from: `${this.config.fromName} <${this.config.fromEmail}>`,
                to: [notification.recipient.email],
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                attachments: notification.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType
                })),
                headers: {
                    'X-Notification-ID': notification.id,
                    'X-Notification-Type': notification.type,
                    'X-Organization-ID': notification.organizationId
                }
            });
            // Store notification record
            await this.storeNotificationRecord(notification, result.data?.id);
            // Update statistics
            this.updateStats(notification, true);
            return {
                id: notification.id,
                success: true,
                messageId: result.data?.id,
                deliveryChannel: 'email',
                timestamp: new Date()
            };
        }
        catch (error) {
            console.error(`Failed to send notification ${notification.id}:`, error);
            // Store failure record
            await this.storeNotificationRecord(notification, undefined, error);
            // Update statistics
            this.updateStats(notification, false);
            return {
                id: notification.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                deliveryChannel: 'email',
                timestamp: new Date()
            };
        }
    }
    async sendBulk(notifications) {
        // Process notifications in batches to avoid rate limits
        const batchSize = 10;
        const results = [];
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const batchPromises = batch.map(notification => this.send(notification));
            const batchResults = await Promise.allSettled(batchPromises);
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    results.push({
                        id: uuidv4(),
                        success: false,
                        error: result.reason?.message || 'Batch processing failed',
                        deliveryChannel: 'email',
                        timestamp: new Date()
                    });
                }
            }
            // Rate limiting: wait between batches
            if (i + batchSize < notifications.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }
    async createTemplate(template) {
        const languageMap = this.templates.get(template.templateId) || new Map();
        languageMap.set(template.language, template);
        this.templates.set(template.templateId, languageMap);
        // Store in persistent storage
        await this.storage.put(`template:${template.templateId}:${template.language}`, JSON.stringify(template));
    }
    async updateTemplate(templateId, template) {
        const existing = await this.getTemplate(templateId, template.language || Language.ENGLISH);
        if (!existing) {
            throw new TemplateNotFoundError(templateId);
        }
        const updated = { ...existing, ...template };
        await this.createTemplate(updated);
    }
    async getTemplate(templateId, language = Language.ENGLISH) {
        // Try to get from memory first
        const languageMap = this.templates.get(templateId);
        if (languageMap?.has(language)) {
            return languageMap.get(language);
        }
        // Try to load from storage
        const stored = await this.storage.get(`template:${templateId}:${language}`);
        if (stored) {
            const template = JSON.parse(stored);
            // Cache in memory
            const map = this.templates.get(templateId) || new Map();
            map.set(language, template);
            this.templates.set(templateId, map);
            return template;
        }
        // Fallback to English if requested language not found
        if (language !== Language.ENGLISH) {
            return this.getTemplate(templateId, Language.ENGLISH);
        }
        return null;
    }
    async schedule(notification, deliveryTime) {
        const scheduledNotification = {
            ...notification,
            deliveryTime
        };
        const scheduleId = uuidv4();
        await this.storage.put(`scheduled:${scheduleId}`, JSON.stringify(scheduledNotification));
        return scheduleId;
    }
    async cancelScheduled(notificationId) {
        await this.storage.delete(`scheduled:${notificationId}`);
    }
    async getDeliveryStatus(notificationId) {
        const record = await this.storage.get(`notification:${notificationId}`);
        if (!record) {
            throw new Error(`Notification record not found: ${notificationId}`);
        }
        return JSON.parse(record);
    }
    async getDeliveryStats(timeRange) {
        // In a real implementation, this would query stored notification records
        // For now, return current session stats
        const totalSent = this.deliveryStats.sent;
        const totalFailed = this.deliveryStats.failed;
        const totalDelivered = this.deliveryStats.delivered;
        return {
            totalSent,
            totalDelivered,
            totalRead: 0, // Would require webhook tracking
            totalClicked: 0, // Would require webhook tracking
            totalFailed,
            deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
            openRate: 0, // Would require webhook tracking
            clickRate: 0, // Would require webhook tracking
            byType: Object.fromEntries(this.deliveryStats.byType),
            byPriority: Object.fromEntries(this.deliveryStats.byPriority),
            byChannel: { email: totalSent }
        };
    }
    async updateRecipientPreferences(userId, preferences) {
        await this.storage.put(`preferences:${userId}`, JSON.stringify(preferences));
    }
    async getRecipientPreferences(userId) {
        const stored = await this.storage.get(`preferences:${userId}`);
        return stored ? JSON.parse(stored) : null;
    }
    // Private helper methods
    async getOrCreateTemplate(notification) {
        if (notification.template) {
            return notification.template;
        }
        // Get template based on notification type
        const templateId = this.getTemplateIdForType(notification.type);
        const template = await this.getTemplate(templateId, notification.recipient.language);
        if (!template) {
            // Create default template
            return this.createDefaultTemplate(notification);
        }
        return template;
    }
    getTemplateIdForType(type) {
        switch (type) {
            case NotificationType.JOB_COMPLETED:
                return 'job-completed';
            case NotificationType.JOB_FAILED:
                return 'job-failed';
            case NotificationType.CSV_IMPORT_COMPLETE:
                return 'csv-import-complete';
            case NotificationType.MYINVOIS_SUBMISSION_SUCCESS:
                return 'myinvois-success';
            case NotificationType.MYINVOIS_SUBMISSION_FAILED:
                return 'myinvois-failed';
            case NotificationType.COMPLIANCE_SCORE_LOW:
                return 'compliance-alert';
            case NotificationType.ACCOUNT_WELCOME:
                return 'welcome';
            default:
                return 'default';
        }
    }
    createDefaultTemplate(notification) {
        return {
            templateId: 'default',
            language: notification.recipient.language,
            subject: notification.title,
            htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Easy e-Invoice - Malaysian e-Invoice Compliance Solution<br>
            <a href="https://easyeinvoice.com.my">https://easyeinvoice.com.my</a>
          </p>
        </div>
      `,
            textContent: `${notification.title}\n\n${notification.message}\n\n---\nEasy e-Invoice - Malaysian e-Invoice Compliance Solution\nhttps://easyeinvoice.com.my`
        };
    }
    async prepareEmailContent(notification, template) {
        // Replace variables in template
        let subject = template.subject;
        let html = template.htmlContent;
        let text = template.textContent || '';
        // Common variables
        const variables = {
            user_name: notification.recipient.name,
            notification_title: notification.title,
            notification_message: notification.message,
            organization_id: notification.organizationId,
            timestamp: this.formatMalaysianDateTime(new Date()),
            ...notification.data
        };
        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
            html = html.replace(new RegExp(placeholder, 'g'), String(value));
            text = text.replace(new RegExp(placeholder, 'g'), String(value));
        }
        return { subject, html, text };
    }
    getMalaysianBusinessContext() {
        const now = new Date();
        const malaysianTime = new Date(now.toLocaleString('en-US', {
            timeZone: MALAYSIAN_LOCALIZATION.timezone
        }));
        const hour = malaysianTime.getHours();
        const day = malaysianTime.getDay();
        const isBusinessHours = hour >= MALAYSIAN_LOCALIZATION.businessHours.start &&
            hour < MALAYSIAN_LOCALIZATION.businessHours.end;
        const isWorkingDay = MALAYSIAN_LOCALIZATION.workingDays.includes(day);
        // Calculate next business day
        const nextBusinessDay = new Date(malaysianTime);
        while (!MALAYSIAN_LOCALIZATION.workingDays.includes(nextBusinessDay.getDay())) {
            nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
        }
        nextBusinessDay.setHours(9, 0, 0, 0);
        return {
            isBusinessHours: isBusinessHours && isWorkingDay,
            isWorkingDay,
            nextBusinessDay,
            malayCalendarEvents: [], // Would be populated from calendar API
            publicHolidays: [] // Would be populated from holiday API
        };
    }
    shouldDelayNotification(notification, context) {
        // Don't delay critical notifications
        if (notification.priority === NotificationPriority.CRITICAL) {
            return false;
        }
        // Don't delay if it's compliance-related
        if (notification.businessContext?.complianceRelated) {
            return false;
        }
        // Delay non-urgent notifications outside business hours
        if (!context.isBusinessHours && notification.priority === NotificationPriority.LOW) {
            return true;
        }
        return false;
    }
    async scheduleForNextBusinessDay(notification) {
        const context = this.getMalaysianBusinessContext();
        await this.schedule(notification, context.nextBusinessDay);
    }
    async storeNotificationRecord(notification, messageId, error) {
        const record = {
            id: notification.id,
            status: messageId ? 'sent' : 'failed',
            sentAt: messageId ? new Date() : undefined,
            failureReason: error ? (error instanceof Error ? error.message : String(error)) : undefined,
            deliveryChannel: 'email'
        };
        await this.storage.put(`notification:${notification.id}`, JSON.stringify(record));
    }
    updateStats(notification, success) {
        if (success) {
            this.deliveryStats.sent++;
            this.deliveryStats.delivered++;
        }
        else {
            this.deliveryStats.failed++;
        }
        // Update by type
        const typeCount = this.deliveryStats.byType.get(notification.type) || 0;
        this.deliveryStats.byType.set(notification.type, typeCount + 1);
        // Update by priority
        const priorityCount = this.deliveryStats.byPriority.get(notification.priority) || 0;
        this.deliveryStats.byPriority.set(notification.priority, priorityCount + 1);
    }
    formatMalaysianDateTime(date) {
        return date.toLocaleString('en-MY', {
            timeZone: MALAYSIAN_LOCALIZATION.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    loadDefaultTemplates() {
        // Load default templates for common notification types
        const defaultTemplates = [
            {
                templateId: 'job-completed',
                language: Language.ENGLISH,
                subject: '✅ Job Completed - {{notification_title}}',
                htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h2 style="margin: 0;">✅ Job Completed Successfully</h2>
            </div>
            <p>Hello {{user_name}},</p>
            <p>Your job <strong>{{notification_title}}</strong> has completed successfully.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Completion Time:</strong> {{timestamp}}</p>
              <p><strong>Organization:</strong> {{organization_id}}</p>
            </div>
            <p>{{notification_message}}</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>Easy e-Invoice - Malaysian e-Invoice Compliance Solution</p>
              <p><a href="https://easyeinvoice.com.my">Visit Dashboard</a></p>
            </div>
          </div>
        `,
                textContent: 'Job Completed: {{notification_title}}\n\nHello {{user_name}},\n\nYour job has completed successfully.\n\n{{notification_message}}\n\nCompletion Time: {{timestamp}}\n\n---\nEasy e-Invoice\nhttps://easyeinvoice.com.my'
            },
            {
                templateId: 'job-failed',
                language: Language.ENGLISH,
                subject: '❌ Job Failed - {{notification_title}}',
                htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f44336; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h2 style="margin: 0;">❌ Job Failed</h2>
            </div>
            <p>Hello {{user_name}},</p>
            <p>Unfortunately, your job <strong>{{notification_title}}</strong> has failed to complete.</p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Error Details:</strong></p>
              <p>{{notification_message}}</p>
            </div>
            <p>Please check the job details in your dashboard or contact support if you need assistance.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
              <p>Easy e-Invoice - Malaysian e-Invoice Compliance Solution</p>
              <p><a href="https://easyeinvoice.com.my">Visit Dashboard</a> | <a href="mailto:support@easyeinvoice.com.my">Contact Support</a></p>
            </div>
          </div>
        `
            }
        ];
        for (const template of defaultTemplates) {
            this.createTemplate(template);
        }
    }
}
