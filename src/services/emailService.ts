// src/services/emailService.ts
import { Resend } from 'resend';

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
  private resend: Resend | null = null;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'AnkaPulse <alerts@ankapulse.app>';
    
    // Solo inicializar si existe la API key
    if (process.env.RESEND_API_KEY) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ Resend initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Resend:', error);
        this.resend = null;
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not found, email service disabled');
    }
  }

  async sendAlertEmail(data: AlertEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.resend) {
      console.warn('Email service not available - RESEND_API_KEY missing');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      console.log('📧 === EMAIL START ===');
      console.log('📧 Payload completo:', JSON.stringify(data, null, 2));

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
                🚨 AnkaPulse - Monitor Notification
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
                    <a href="${process.env.FRONTEND_URL || 'https://ankapulse.app'}/dashboard" 
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
 * Email de bienvenida
 */
async sendWelcomeEmail(userEmail: string, userName?: string): Promise<{ success: boolean }> {
  if (!this.resend) {
    console.warn('Email service not available - RESEND_API_KEY missing');
    return { success: false };
  }

  try {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: userEmail,
      subject: '🚀 ¡Bienvenido a AnkaPulse!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">¡Bienvenido a AnkaPulse! 🚀</h1>
          
          <p>Hola ${userName || 'Developer'},</p>
          
          <p>¡Gracias por unirte a AnkaPulse! Tu cuenta está lista y puedes empezar a monitorear tus APIs ahora mismo.</p>
          
          <h3 style="color: #1f2937;">🎯 Primeros pasos:</h3>
          <ol style="line-height: 1.6;">
            <li><strong>Crea tu primer check:</strong> <a href="${process.env.FRONTEND_URL || 'https://ankapulse.app'}/checks/new" style="color: #2563eb;">Nuevo Check</a></li>
            <li><strong>Configura alertas:</strong> <a href="${process.env.FRONTEND_URL || 'https://ankapulse.app'}/alerts" style="color: #2563eb;">Email y Telegram</a></li>
            <li><strong>Ve tu dashboard:</strong> <a href="${process.env.FRONTEND_URL || 'https://ankapulse.app'}/dashboard" style="color: #2563eb;">Métricas en tiempo real</a></li>
          </ol>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 Tip:</strong> Configura alertas de Telegram para recibir notificaciones instantáneas sin filtros de spam.</p>
          </div>
          
          
          <p style="margin-top: 30px;">
            ¡Feliz monitoreo! 📊<br>
            <strong>El equipo de AnkaPulse</strong>
          </p>
        </div>
      `,
    });

    console.log(`✅ Welcome email sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false };
  }
}

async sendPasswordResetEmail(userEmail: string, resetUrl: string): Promise<{ success: boolean }> {
  
  if (!this.resend) {
    console.warn('❌ [4] RESEND CLIENT IS NULL');
    return { success: false };
  }

  try {
       
   const result = await this.resend.emails.send({
      from: 'no-reply@ankapulse.app',
      to: userEmail,
      subject: '🔐 Recuperación de contraseña - AnkaPulse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Recuperación de contraseña 🔐</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">
              Hola,
            </p>
            
            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
              Has solicitado resetear tu contraseña en <strong>AnkaPulse</strong>.
            </p>
            
            <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px;">
              Haz click en el siguiente botón para crear una nueva contraseña:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a 
                href="${resetUrl}" 
                style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;"
              >
                Resetear Contraseña
              </a>
            </div>
          </div>
          
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Este enlace expira en <strong>1 hora</strong> por seguridad.
            </p>
          </div>
          
          <div style="margin: 25px 0; padding: 15px; background: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
              <strong>Si el botón no funciona</strong>, copia y pega este enlace en tu navegador:
            </p>
            <p style="margin: 0; word-break: break-all;">
              <a href="${resetUrl}" style="color: #2563eb; font-size: 13px;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
              Si no solicitaste este cambio, puedes ignorar este email de forma segura.
            </p>
            
            <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
              Saludos,<br>
              <strong style="color: #374151;">El equipo de AnkaPulse</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              AnkaPulse - Monitoreo de APIs simple y accesible
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return { success: false };
    }

    console.log(`✅ Password reset email sent to ${userEmail}`);
    return { success: true };
    
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    return { success: false };
  }
}
}
export const emailService = new EmailService();