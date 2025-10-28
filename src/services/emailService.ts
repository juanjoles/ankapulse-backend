// src/services/emailService.ts
import { Resend } from 'resend';

//const resend = new Resend(process.env.RESEND_API_KEY);

export interface AlertEmailData {
  userEmail: string;
  userName?: string;
  checkName: string;
  checkUrl: string;
  errorMessage?: string;
  statusCode?: number;
  latency?: number;
  region?: string;
  timestamp: Date;
}

export class EmailService {
  private fromEmail: string;
  private resend: Resend;

  constructor() {
    // En desarrollo puedes usar onboarding@resend.dev
    // En producción usa tu dominio verificado
    this.resend = new Resend(process.env.RESEND_API_KEY!);
    this.fromEmail = process.env.EMAIL_FROM || 'AnkaPulse <onboarding@resend.dev>';
  }

  /**
   * Envía email de alerta cuando un check falla
   */
  async sendAlertEmail(data: AlertEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const htmlContent = this.generateAlertEmailHTML(data);

      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.userEmail,
        subject: `🚨 Alert: ${data.checkName} is DOWN`,
        html: htmlContent,
      });

      console.log(`✅ Alert email sent successfully to ${data.userEmail}`);
      console.log(`   Message ID: ${response.data?.id}`);

      return {
        success: true,
        messageId: response.data?.id,
      };

    } catch (error: any) {
      console.error(`❌ Failed to send alert email to ${data.userEmail}:`, error.message);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera el HTML del email de alerta
   */
  private generateAlertEmailHTML(data: AlertEmailData): string {
    const statusCodeText = data.statusCode ? `Status Code: ${data.statusCode}` : 'Timeout';
    const latencyText = data.latency ? `${data.latency}ms` : 'N/A';
    const errorText = data.errorMessage || 'Service is not responding';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AnkaPulse Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🚨 Service Alert
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${data.userName ? `Hi ${data.userName},` : 'Hi,'}
              </p>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.5;">
                Your monitored service <strong>${data.checkName}</strong> is currently down and not responding as expected.
              </p>

              <!-- Alert Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    
                    <p style="margin: 0 0 12px; color: #991b1b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Alert Details
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Service:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.checkName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">URL:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500; word-break: break-all;">${data.checkUrl}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 600;">${statusCodeText}</td>
                      </tr>
                      ${data.region ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Region:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.region}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Latency:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${latencyText}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.timestamp.toLocaleString('en-US', { 
                          dateStyle: 'medium', 
                          timeStyle: 'short',
                          timeZone: 'UTC'
                        })} UTC</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Error:</td>
                        <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 500;">${errorText}</td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${process.env.FRONTEND_URL || 'https://AnkaPulse.com'}/dashboard" 
                       style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                This is an automated alert from AnkaPulse. We'll notify you again if the issue persists or when the service recovers.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                <strong>AnkaPulse</strong> - API & Application Monitoring<br>
                Monitoring your services 24/7 from multiple regions
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
    `;
  }

  /**
   * Email de bienvenida (opcional, para cuando implementes login)
   */
  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<{ success: boolean }> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: userEmail,
        subject: '👋 Welcome to AnkaPulse',
        html: `
          <h1>Welcome to AnkaPulse!</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>Thanks for signing up. Start monitoring your APIs and applications from multiple regions.</p>
          <p><a href="${process.env.FRONTEND_URL || 'https://AnkaPulse.com'}/dashboard">Go to Dashboard</a></p>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false };
    }
  }
}