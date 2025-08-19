// Email Templates for Easy e-Invoice Notifications
// Malaysian localized email templates with business context

import { EmailTemplate, Language, NotificationType } from './types';

// Template registry for different notification types and languages
export const EMAIL_TEMPLATES: Record<string, Record<Language, EmailTemplate>> = {
  // Job completion templates
  'job-completed': {
    [Language.ENGLISH]: {
      templateId: 'job-completed',
      language: Language.ENGLISH,
      subject: '✅ Job Completed Successfully - {{job_type}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Completed - Easy e-Invoice</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">✅ Job Completed Successfully</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Easy e-Invoice - Malaysian e-Invoice Solution</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Hello <strong>{{user_name}}</strong>,</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                Great news! Your <strong>{{job_type}}</strong> job has completed successfully.
              </p>
              
              <!-- Job Details -->
              <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Job Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Job Type:</td>
                    <td style="padding: 8px 0; color: #333;">{{job_type}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Completed:</td>
                    <td style="padding: 8px 0; color: #333;">{{completion_time}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Duration:</td>
                    <td style="padding: 8px 0; color: #333;">{{duration}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: bold;">Items Processed:</td>
                    <td style="padding: 8px 0; color: #333;">{{items_processed}}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Statistics -->
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #2e7d32;">Processing Results</h3>
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                  <div style="text-align: center; margin: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">{{successful_items}}</div>
                    <div style="color: #666; font-size: 14px;">Successful</div>
                  </div>
                  <div style="text-align: center; margin: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ff9800;">{{failed_items}}</div>
                    <div style="color: #666; font-size: 14px;">Failed</div>
                  </div>
                  <div style="text-align: center; margin: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: #9e9e9e;">{{skipped_items}}</div>
                    <div style="color: #666; font-size: 14px;">Skipped</div>
                  </div>
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Results in Dashboard
                </a>
              </div>
              
              <!-- Malaysian Compliance Note -->
              <div style="background: #fff3e0; border: 1px solid #ffcc02; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #e65100;">
                  <strong>🇲🇾 Malaysian Compliance:</strong> All processed items have been validated according to LHDN e-Invoice requirements.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Easy e-Invoice - Simplifying Malaysian e-Invoice Compliance</p>
              <p style="margin: 0;">
                <a href="https://easyeinvoice.com.my" style="color: #4CAF50;">Dashboard</a> | 
                <a href="https://easyeinvoice.com.my/support" style="color: #4CAF50;">Support</a> | 
                <a href="https://easyeinvoice.com.my/docs" style="color: #4CAF50;">Documentation</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        ✅ JOB COMPLETED SUCCESSFULLY
        
        Hello {{user_name}},
        
        Great news! Your {{job_type}} job has completed successfully.
        
        JOB SUMMARY:
        - Job Type: {{job_type}}
        - Completed: {{completion_time}}
        - Duration: {{duration}}
        - Items Processed: {{items_processed}}
        
        PROCESSING RESULTS:
        - Successful: {{successful_items}}
        - Failed: {{failed_items}}
        - Skipped: {{skipped_items}}
        
        🇲🇾 Malaysian Compliance: All processed items have been validated according to LHDN e-Invoice requirements.
        
        View your results: {{dashboard_url}}
        
        ---
        Easy e-Invoice - Simplifying Malaysian e-Invoice Compliance
        https://easyeinvoice.com.my
      `
    },
    
    [Language.MALAY]: {
      templateId: 'job-completed',
      language: Language.MALAY,
      subject: '✅ Tugas Selesai - {{job_type}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">✅ Tugas Selesai Dengan Jayanya</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Easy e-Invoice - Penyelesaian e-Invois Malaysia</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <p>Salam sejahtera <strong>{{user_name}}</strong>,</p>
              
              <p>Berita gembira! Tugas <strong>{{job_type}}</strong> anda telah selesai dengan jayanya.</p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">Ringkasan Tugas</h3>
                <p><strong>Jenis Tugas:</strong> {{job_type}}</p>
                <p><strong>Selesai:</strong> {{completion_time}}</p>
                <p><strong>Tempoh:</strong> {{duration}}</p>
                <p><strong>Item Diproses:</strong> {{items_processed}}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Lihat Keputusan
                </a>
              </div>
              
              <div style="background: #fff3e0; border: 1px solid #ffcc02; padding: 15px; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>🇲🇾 Pematuhan Malaysia:</strong> Semua item telah disahkan mengikut keperluan e-Invois LHDN.
                </p>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
              <p>Easy e-Invoice - Memudahkan Pematuhan e-Invois Malaysia</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        ✅ TUGAS SELESAI DENGAN JAYANYA
        
        Salam sejahtera {{user_name}},
        
        Berita gembira! Tugas {{job_type}} anda telah selesai dengan jayanya.
        
        Jenis Tugas: {{job_type}}
        Selesai: {{completion_time}}
        Tempoh: {{duration}}
        
        🇲🇾 Pematuhan Malaysia: Semua item telah disahkan mengikut keperluan e-Invois LHDN.
        
        Lihat keputusan: {{dashboard_url}}
        
        Easy e-Invoice - Memudahkan Pematuhan e-Invois Malaysia
        https://easyeinvoice.com.my
      `
    }
  },

  // CSV Import completion template
  'csv-import-complete': {
    [Language.ENGLISH]: {
      templateId: 'csv-import-complete',
      language: Language.ENGLISH,
      subject: '📊 CSV Import Completed - {{file_name}}',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📊 CSV Import Completed</h1>
            </div>
            
            <div style="padding: 30px 20px;">
              <p>Hello <strong>{{user_name}}</strong>,</p>
              
              <p>Your CSV file <strong>{{file_name}}</strong> has been successfully imported and processed.</p>
              
              <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">Import Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div>
                    <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">{{successful_records}}</div>
                    <div style="color: #666;">Records Imported</div>
                  </div>
                  <div>
                    <div style="font-size: 24px; font-weight: bold; color: #f44336;">{{failed_records}}</div>
                    <div style="color: #666;">Failed Records</div>
                  </div>
                </div>
              </div>
              
              <!-- Compliance Section -->
              <div style="background: #f1f8e9; border: 1px solid #8bc34a; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #689f38;">Malaysian Compliance Validation</h4>
                <p style="margin: 0; font-size: 14px;">
                  ✓ TIN format validation completed<br>
                  ✓ SST calculations verified<br>
                  ✓ Currency and exchange rate checks passed
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View Imported Invoices
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },

  // MyInvois submission templates
  'myinvois-success': {
    [Language.ENGLISH]: {
      templateId: 'myinvois-success',
      language: Language.ENGLISH,
      subject: '🇲🇾 MyInvois Submission Successful',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #FF9800, #F57C00); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🇲🇾 MyInvois Submission Successful</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Lembaga Hasil Dalam Negeri Malaysia</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <p>Hello <strong>{{user_name}}</strong>,</p>
              
              <p>Excellent! Your invoices have been successfully submitted to the MyInvois portal.</p>
              
              <div style="background: #fff3e0; border-left: 4px solid #FF9800; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0;">Submission Details</h3>
                <p><strong>Reference Number:</strong> {{reference_number}}</p>
                <p><strong>Submission ID:</strong> {{submission_id}}</p>
                <p><strong>Invoices Submitted:</strong> {{invoice_count}}</p>
                <p><strong>Submission Time:</strong> {{submission_time}}</p>
              </div>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #2e7d32;">
                  <strong>✓ LHDN Compliant:</strong> Your invoices meet all Malaysian e-Invoice requirements and have been accepted by the MyInvois system.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{myinvois_portal_url}}" style="background: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  View in MyInvois Portal
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },

  // Compliance alert templates
  'compliance-alert': {
    [Language.ENGLISH]: {
      templateId: 'compliance-alert',
      language: Language.ENGLISH,
      subject: '⚠️ Compliance Alert - Action Required',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Compliance Alert</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Attention Required</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <p>Hello <strong>{{user_name}}</strong>,</p>
              
              <p style="color: #d32f2f; font-weight: bold;">
                We've detected compliance issues that require your immediate attention.
              </p>
              
              <div style="background: #ffebee; border: 1px solid #f44336; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin: 0 0 15px 0; color: #d32f2f;">Alert Details</h3>
                <p><strong>Alert Type:</strong> {{alert_type}}</p>
                <p><strong>Severity:</strong> {{severity}}</p>
                <p><strong>Affected Invoices:</strong> {{affected_invoices}}</p>
                {{#if compliance_score}}
                <p><strong>Compliance Score:</strong> {{compliance_score}}%</p>
                {{/if}}
                {{#if deadline}}
                <p><strong>Deadline:</strong> {{deadline}}</p>
                {{/if}}
              </div>
              
              <div style="background: #fff3e0; border-left: 4px solid #ffcc02; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #f57c00;">Recommended Actions</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  {{#each recommended_actions}}
                  <li style="margin-bottom: 5px;">{{this}}</li>
                  {{/each}}
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{compliance_dashboard_url}}" style="background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Review Compliance Issues
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  },

  // Welcome template
  'welcome': {
    [Language.ENGLISH]: {
      templateId: 'welcome',
      language: Language.ENGLISH,
      subject: '🎉 Welcome to Easy e-Invoice - Get Started with Malaysian e-Invoice Compliance',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #673AB7, #512DA8); color: white; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Easy e-Invoice!</h1>
              <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">Your Malaysian e-Invoice Compliance Solution</p>
            </div>
            
            <div style="padding: 30px 20px;">
              <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>{{user_name}}</strong>,</p>
              
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Welcome to Easy e-Invoice! We're excited to help you navigate Malaysia's e-Invoice requirements with confidence and ease.
              </p>
              
              <!-- Getting Started Section -->
              <div style="background: #f3e5f5; border-left: 4px solid #673AB7; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 20px 0; color: #4A148C;">🚀 Getting Started</h3>
                <div style="margin-bottom: 15px;">
                  <div style="display: inline-block; background: #673AB7; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">1</div>
                  <strong>Complete your organization setup</strong> - Add your TIN and business details
                </div>
                <div style="margin-bottom: 15px;">
                  <div style="display: inline-block; background: #673AB7; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">2</div>
                  <strong>Create your first invoice</strong> - Use our guided invoice creator
                </div>
                <div style="margin-bottom: 0;">
                  <div style="display: inline-block; background: #673AB7; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">3</div>
                  <strong>Validate compliance</strong> - Ensure 100% LHDN compliance
                </div>
              </div>
              
              <!-- Features Overview -->
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin: 0 0 20px 0; color: #2e7d32;">✨ What You Can Do</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div>
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">📊 Import & Export</div>
                    <div style="font-size: 14px; color: #666;">Bulk CSV import and multiple export formats</div>
                  </div>
                  <div>
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">🇲🇾 MyInvois Ready</div>
                    <div style="font-size: 14px; color: #666;">Direct submission to LHDN portal</div>
                  </div>
                  <div>
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">✅ Real-time Validation</div>
                    <div style="font-size: 14px; color: #666;">Instant compliance checking</div>
                  </div>
                  <div>
                    <div style="font-weight: bold; color: #2e7d32; margin-bottom: 5px;">📈 Compliance Tracking</div>
                    <div style="font-size: 14px; color: #666;">Monitor your compliance score</div>
                  </div>
                </div>
              </div>
              
              <!-- Malaysian Context -->
              <div style="background: #fff8e1; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #f57c00;">🇲🇾 Malaysian e-Invoice Requirements</h4>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #e65100;">
                  <strong>Important:</strong> Malaysia's e-Invoice mandate is being phased in. Companies with annual turnover above RM25 million must comply from January 2025. 
                  Easy e-Invoice ensures you're ready for all LHDN requirements.
                </p>
              </div>
              
              <!-- Call to Action -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="{{dashboard_url}}" style="background: #673AB7; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; margin-bottom: 15px;">
                  Start Your Setup
                </a>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <a href="{{support_url}}" style="color: #673AB7;">Need help?</a> | 
                  <a href="{{documentation_url}}" style="color: #673AB7;">Read our guides</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 25px 20px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Easy e-Invoice Team</p>
              <p style="margin: 0 0 15px 0;">Simplifying Malaysian e-Invoice Compliance for Businesses</p>
              <p style="margin: 0;">
                <a href="https://easyeinvoice.com.my" style="color: #673AB7; text-decoration: none;">Website</a> | 
                <a href="mailto:support@easyeinvoice.com.my" style="color: #673AB7; text-decoration: none;">Support</a> | 
                <a href="{{unsubscribe_url}}" style="color: #666; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        🎉 WELCOME TO EASY E-INVOICE!
        
        Hello {{user_name}},
        
        Welcome to Easy e-Invoice! We're excited to help you navigate Malaysia's e-Invoice requirements with confidence and ease.
        
        GETTING STARTED:
        1. Complete your organization setup - Add your TIN and business details
        2. Create your first invoice - Use our guided invoice creator  
        3. Validate compliance - Ensure 100% LHDN compliance
        
        WHAT YOU CAN DO:
        ✓ Import & Export - Bulk CSV import and multiple export formats
        ✓ MyInvois Ready - Direct submission to LHDN portal
        ✓ Real-time Validation - Instant compliance checking
        ✓ Compliance Tracking - Monitor your compliance score
        
        🇲🇾 MALAYSIAN E-INVOICE REQUIREMENTS:
        Malaysia's e-Invoice mandate is being phased in. Companies with annual turnover above RM25 million must comply from January 2025. Easy e-Invoice ensures you're ready for all LHDN requirements.
        
        Get started: {{dashboard_url}}
        Need help: {{support_url}}
        Documentation: {{documentation_url}}
        
        ---
        Easy e-Invoice Team
        Simplifying Malaysian e-Invoice Compliance for Businesses
        https://easyeinvoice.com.my
      `
    }
  }
};

// Helper function to get template
export const getEmailTemplate = (
  templateId: string, 
  language: Language = Language.ENGLISH
): EmailTemplate | null => {
  const templates = EMAIL_TEMPLATES[templateId];
  if (!templates) return null;
  
  return templates[language] || templates[Language.ENGLISH] || null;
};

// Helper function to get all available templates
export const getAllTemplateIds = (): string[] => {
  return Object.keys(EMAIL_TEMPLATES);
};

// Helper function to get supported languages for a template
export const getTemplateSupportedLanguages = (templateId: string): Language[] => {
  const templates = EMAIL_TEMPLATES[templateId];
  if (!templates) return [];
  
  return Object.keys(templates) as Language[];
};