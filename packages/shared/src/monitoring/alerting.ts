import { createContextLogger } from './logger';
import { trackError } from './metrics';

const logger = createContextLogger('alerting');

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Alert channels
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'sms' | 'console';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  service: string;
  timestamp: string;
  context?: Record<string, any>;
  tags?: string[];
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldown?: number; // milliseconds between alerts
  enabled: boolean;
  tags?: string[];
}

export interface AlertChannel {
  type: AlertChannel;
  config: any;
  enabled: boolean;
}

// Alert storage and management
class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<AlertChannel, any> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  // Register alert rule
  registerRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule registered', { ruleId: rule.id, ruleName: rule.name });
  }

  // Register alert channel
  registerChannel(type: AlertChannel, config: any) {
    this.channels.set(type, { ...config, enabled: true });
    logger.info('Alert channel registered', { type });
  }

  // Check if alert is in cooldown
  private isInCooldown(ruleId: string, cooldown: number): boolean {
    const lastAlert = this.alertCooldowns.get(ruleId);
    if (!lastAlert) return false;
    
    return Date.now() - lastAlert < cooldown;
  }

  // Trigger alert evaluation
  async triggerAlert(eventType: string, data: any) {
    const matchingRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && rule.condition(data)
    );

    for (const rule of matchingRules) {
      // Check cooldown
      if (rule.cooldown && this.isInCooldown(rule.id, rule.cooldown)) {
        continue;
      }

      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rule.name,
        message: this.formatAlertMessage(rule, data),
        severity: rule.severity,
        service: data.service || 'unknown',
        timestamp: new Date().toISOString(),
        context: data,
        tags: rule.tags,
        resolved: false
      };

      // Store alert
      this.activeAlerts.set(alert.id, alert);
      
      // Update cooldown
      if (rule.cooldown) {
        this.alertCooldowns.set(rule.id, Date.now());
      }

      // Send alert through configured channels
      await this.sendAlert(alert, rule.channels);

      // Track alert metric
      trackError(alert.service, eventType, alert.severity);

      logger.warn('Alert triggered', { 
        alertId: alert.id, 
        ruleId: rule.id, 
        severity: alert.severity 
      });
    }
  }

  // Format alert message
  private formatAlertMessage(rule: AlertRule, data: any): string {
    // Basic template - could be enhanced with proper templating
    return `${rule.description}\n\nDetails:\n${JSON.stringify(data, null, 2)}`;
  }

  // Send alert through channels
  private async sendAlert(alert: Alert, channels: AlertChannel[]) {
    const sendPromises = channels.map(channel => this.sendToChannel(alert, channel));
    
    try {
      await Promise.allSettled(sendPromises);
    } catch (error) {
      logger.error('Failed to send alert', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Send to specific channel
  private async sendToChannel(alert: Alert, channelType: AlertChannel) {
    const channelConfig = this.channels.get(channelType);
    if (!channelConfig || !channelConfig.enabled) {
      return;
    }

    try {
      switch (channelType) {
        case 'email':
          await this.sendEmailAlert(alert, channelConfig);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, channelConfig);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, channelConfig);
          break;
        case 'console':
          this.sendConsoleAlert(alert);
          break;
        case 'sms':
          await this.sendSmsAlert(alert, channelConfig);
          break;
        default:
          logger.warn('Unknown alert channel type', { channelType });
      }
    } catch (error) {
      logger.error('Failed to send alert to channel', { 
        alertId: alert.id, 
        channelType, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Email alert implementation
  private async sendEmailAlert(alert: Alert, config: any) {
    // In a real implementation, this would use Resend or similar service
    logger.info('Email alert would be sent', { 
      alertId: alert.id, 
      recipients: config.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
    });
  }

  // Slack alert implementation
  private async sendSlackAlert(alert: Alert, config: any) {
    // In a real implementation, this would use Slack webhook
    const slackMessage = {
      text: `🚨 Alert: ${alert.title}`,
      attachments: [{
        color: this.getSlackColor(alert.severity),
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Service', value: alert.service, short: true },
          { title: 'Time', value: alert.timestamp, short: true },
          { title: 'Message', value: alert.message, short: false }
        ]
      }]
    };

    logger.info('Slack alert would be sent', { 
      alertId: alert.id, 
      webhook: config.webhookUrl,
      message: slackMessage
    });
  }

  // Webhook alert implementation
  private async sendWebhookAlert(alert: Alert, config: any) {
    // In a real implementation, this would make HTTP request
    logger.info('Webhook alert would be sent', { 
      alertId: alert.id, 
      url: config.url,
      payload: alert
    });
  }

  // Console alert (for development)
  private sendConsoleAlert(alert: Alert) {
    const emoji = this.getAlertEmoji(alert.severity);
    console.log(`\n${emoji} ALERT [${alert.severity.toUpperCase()}] ${emoji}`);
    console.log(`Title: ${alert.title}`);
    console.log(`Service: ${alert.service}`);
    console.log(`Time: ${alert.timestamp}`);
    console.log(`Message: ${alert.message}`);
    if (alert.context) {
      console.log('Context:', JSON.stringify(alert.context, null, 2));
    }
    console.log('─'.repeat(50));
  }

  // SMS alert implementation
  private async sendSmsAlert(alert: Alert, config: any) {
    // Only for critical alerts
    if (alert.severity !== 'critical') return;
    
    logger.info('SMS alert would be sent', { 
      alertId: alert.id, 
      recipients: config.phoneNumbers,
      message: `CRITICAL: ${alert.title} - ${alert.service}`
    });
  }

  // Helper methods
  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'error': return 'warning';
      case 'warning': return '#ffaa00';
      case 'info': return 'good';
      default: return '#dddddd';
    }
  }

  private getAlertEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return '🔥';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  // Resolve alert
  resolveAlert(alertId: string, resolvedBy?: string) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolvedBy = resolvedBy;
      
      logger.info('Alert resolved', { alertId, resolvedBy });
    }
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  // Get all alerts
  getAllAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Common alert rules for Easy e-Invoice

// High error rate alert
export const highErrorRateRule: AlertRule = {
  id: 'high_error_rate',
  name: 'High Error Rate Detected',
  description: 'Error rate has exceeded threshold',
  condition: (data) => {
    return data.errorRate && data.errorRate > 0.05; // 5% error rate
  },
  severity: 'error',
  channels: ['email', 'slack'],
  cooldown: 300000, // 5 minutes
  enabled: true,
  tags: ['performance', 'errors']
};

// Malaysian validation failure alert
export const validationFailureRule: AlertRule = {
  id: 'malaysian_validation_failure',
  name: 'Malaysian Validation System Failure',
  description: 'Critical failure in Malaysian e-Invoice validation system',
  condition: (data) => {
    return data.service === 'validation' && data.severity === 'critical';
  },
  severity: 'critical',
  channels: ['email', 'slack', 'sms'],
  cooldown: 900000, // 15 minutes
  enabled: true,
  tags: ['compliance', 'validation', 'critical']
};

// Database connection issues
export const databaseIssueRule: AlertRule = {
  id: 'database_connection',
  name: 'Database Connection Issues',
  description: 'Database connectivity problems detected',
  condition: (data) => {
    return data.component === 'database' && data.status === 'unhealthy';
  },
  severity: 'critical',
  channels: ['email', 'slack', 'webhook'],
  cooldown: 600000, // 10 minutes
  enabled: true,
  tags: ['infrastructure', 'database']
};

// High memory usage alert
export const highMemoryUsageRule: AlertRule = {
  id: 'high_memory_usage',
  name: 'High Memory Usage',
  description: 'Memory usage has exceeded safe threshold',
  condition: (data) => {
    return data.memoryUsagePercent && data.memoryUsagePercent > 90;
  },
  severity: 'warning',
  channels: ['email', 'slack'],
  cooldown: 1800000, // 30 minutes
  enabled: true,
  tags: ['performance', 'memory']
};

// File processing failure alert
export const fileProcessingFailureRule: AlertRule = {
  id: 'file_processing_failure',
  name: 'File Processing Failure',
  description: 'High failure rate in CSV file processing',
  condition: (data) => {
    return data.operation === 'file_processing' && data.failureRate > 0.25; // 25% failure rate
  },
  severity: 'error',
  channels: ['email', 'slack'],
  cooldown: 600000, // 10 minutes
  enabled: true,
  tags: ['file-processing', 'csv']
};

// API response time alert
export const slowApiResponseRule: AlertRule = {
  id: 'slow_api_response',
  name: 'Slow API Response Times',
  description: 'API response times are degraded',
  condition: (data) => {
    return data.responseTime && data.responseTime > 5000; // 5 seconds
  },
  severity: 'warning',
  channels: ['slack'],
  cooldown: 900000, // 15 minutes
  enabled: true,
  tags: ['performance', 'api']
};

// Security alert
export const securityIssueRule: AlertRule = {
  id: 'security_issue',
  name: 'Security Issue Detected',
  description: 'Potential security threat detected',
  condition: (data) => {
    return data.securityEvent && ['medium', 'high', 'critical'].includes(data.severity);
  },
  severity: 'critical',
  channels: ['email', 'slack', 'webhook'],
  cooldown: 0, // No cooldown for security issues
  enabled: true,
  tags: ['security', 'threat']
};

// Initialize default alert rules
export function initializeDefaultAlerts() {
  alertManager.registerRule(highErrorRateRule);
  alertManager.registerRule(validationFailureRule);
  alertManager.registerRule(databaseIssueRule);
  alertManager.registerRule(highMemoryUsageRule);
  alertManager.registerRule(fileProcessingFailureRule);
  alertManager.registerRule(slowApiResponseRule);
  alertManager.registerRule(securityIssueRule);

  logger.info('Default alert rules initialized', { 
    rulesCount: 7 
  });
}

// Configure alert channels
export function configureAlertChannels(config: {
  email?: { recipients: string[]; smtpConfig?: any };
  slack?: { webhookUrl: string; channel?: string };
  webhook?: { url: string; headers?: Record<string, string> };
  sms?: { phoneNumbers: string[]; provider?: string };
}) {
  if (config.email) {
    alertManager.registerChannel('email', config.email);
  }
  
  if (config.slack) {
    alertManager.registerChannel('slack', config.slack);
  }
  
  if (config.webhook) {
    alertManager.registerChannel('webhook', config.webhook);
  }
  
  if (config.sms) {
    alertManager.registerChannel('sms', config.sms);
  }

  // Always enable console for development
  alertManager.registerChannel('console', {});

  logger.info('Alert channels configured', { 
    channels: Object.keys(config) 
  });
}

// Convenience functions for common alerts

export function alertHighErrorRate(errorRate: number, service: string) {
  alertManager.triggerAlert('high_error_rate', {
    errorRate,
    service,
    timestamp: new Date().toISOString()
  });
}

export function alertValidationFailure(error: Error, context?: any) {
  alertManager.triggerAlert('validation_failure', {
    service: 'validation',
    severity: 'critical',
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

export function alertDatabaseIssue(error: Error) {
  alertManager.triggerAlert('database_issue', {
    component: 'database',
    status: 'unhealthy',
    error: error.message,
    timestamp: new Date().toISOString()
  });
}

export function alertSecurityIssue(event: string, severity: 'medium' | 'high' | 'critical', details?: any) {
  alertManager.triggerAlert('security_issue', {
    securityEvent: event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
}

export function alertPerformanceIssue(metric: string, value: number, threshold: number, service: string) {
  alertManager.triggerAlert('performance_issue', {
    metric,
    value,
    threshold,
    service,
    timestamp: new Date().toISOString()
  });
}

// Express middleware for alert management endpoints
export function alertingEndpoints() {
  return {
    // Get active alerts
    getAlerts: (req: any, res: any) => {
      const alerts = alertManager.getActiveAlerts();
      res.json({ alerts, count: alerts.length });
    },

    // Resolve alert
    resolveAlert: (req: any, res: any) => {
      const { alertId } = req.params;
      const { resolvedBy } = req.body;
      
      alertManager.resolveAlert(alertId, resolvedBy);
      res.json({ success: true });
    },

    // Test alert
    testAlert: (req: any, res: any) => {
      const { severity = 'info', message = 'Test alert' } = req.body;
      
      alertManager.triggerAlert('test', {
        service: 'test',
        severity,
        message,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true, message: 'Test alert triggered' });
    }
  };
}

export default {
  alertManager,
  initializeDefaultAlerts,
  configureAlertChannels,
  alertHighErrorRate,
  alertValidationFailure,
  alertDatabaseIssue,
  alertSecurityIssue,
  alertPerformanceIssue,
  alertingEndpoints
};