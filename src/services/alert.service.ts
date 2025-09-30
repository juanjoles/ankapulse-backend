import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AlertService {
  
  async handleFailure(checkId: string, checkResultId: string) {
    try {
      // Verificar si ya se envió una alerta reciente (últimos 30 minutos)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const recentAlert = await prisma.alert.findFirst({
        where: {
          checkId,
          sentAt: {
            gte: thirtyMinutesAgo,
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      if (recentAlert) {
        console.log(`⏭️ Alert recently sent for check ${checkId} (${recentAlert.sentAt.toISOString()}), skipping to avoid spam...`);
        return null;
      }

      // Obtener información del check y usuario para la notificación
      const check = await prisma.check.findUnique({
        where: { id: checkId },
        include: {
          user: true,
        },
      });

      if (!check) {
        console.error(`❌ Check ${checkId} not found`);
        return null;
      }

      // Crear registro de alerta en BD
      const alert = await prisma.alert.create({
        data: {
          checkId,
          checkResultId,
          alertType: 'email', // Por ahora solo email
          success: true, // Simulamos que se envió correctamente
          errorMessage: null,
        },
      });

      // Simular envío de notificación (integración real viene después)
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                    🚨 ALERT TRIGGERED                      ║
╠════════════════════════════════════════════════════════════╣
║ Alert ID:     ${alert.id}
║ Check ID:     ${checkId}
║ Check Name:   ${check.name || check.url}
║ URL:          ${check.url}
║ User Email:   ${check.user.email}
║ Timestamp:    ${alert.sentAt.toISOString()}
║ 
║ 📧 [SIMULATED] Email would be sent to: ${check.user.email}
╚════════════════════════════════════════════════════════════╝
      `);

      return alert;

    } catch (error: any) {
      console.error(`❌ Error handling failure for check ${checkId}:`, error.message);
      
      // Intentar crear alerta marcada como fallida
      try {
        await prisma.alert.create({
          data: {
            checkId,
            checkResultId,
            alertType: 'email',
            success: false,
            errorMessage: error.message,
          },
        });
      } catch (dbError) {
        console.error('❌ Could not save failed alert to database');
      }

      throw error;
    }
  }
}