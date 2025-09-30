import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connection } from '../config/redis.config';
import { AlertService } from './alert.service';

const prisma = new PrismaClient();
const alertService = new AlertService();

interface MonitorJobData {
  checkId: string;
  url: string;
  userId: string;
  timeout: number;
  expectedStatusCode: number;
}

export class WorkerService {
  private worker: Worker;

  constructor() {
    console.log('🔧 Creating worker...');
    this.worker = new Worker(
      'monitor-queue',
      async (job: Job<MonitorJobData>) => {
        return await this.processCheck(job.data);
      },
      {
        connection,
        concurrency: 5, // Procesar hasta 5 jobs simultáneamente
      }
    );
    
    // Eventos del worker
    this.worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
      console.error(`   Full error:`, err); // DEBUG - BORRAR
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker error:', err);
    });
  }

  private async processCheck(data: MonitorJobData) {
    const { checkId, url, timeout, expectedStatusCode } = data;
    const region = process.env.WORKER_REGION || 'us-east';

    console.log(`🔍 Processing check ${checkId} for URL: ${url}`);

    const startTime = Date.now();
    let statusCode = 0;
    let success = false;
    let errorMessage: string | null = null;

    try {
      // Configurar timeout con AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      // Ejecutar request
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'User-Agent': 'HawkPulse-Monitor/1.0',
        },
      });

      clearTimeout(timeoutId);
      
      statusCode = response.status;
      success = statusCode === expectedStatusCode;

      console.log(`📊 Check ${checkId}: Status ${statusCode}, Expected ${expectedStatusCode}`);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        console.log(`⏱️ Check ${checkId}: Timeout after ${timeout}s`);
      } else {
        errorMessage = error.message || 'Unknown error';
        console.log(`⚠️ Check ${checkId}: Error - ${errorMessage}`);
      }
      success = false;
    }

    const latencyMs = Date.now() - startTime;

    try {
      // Guardar resultado en BD usando Prisma
      const checkResult = await prisma.checkResult.create({
        data: {
          checkId,
          region,
          statusCode,
          latencyMs,
          success,
          errorMessage,
        },
      });

      // Actualizar el check con último estado
      await prisma.check.update({
        where: { id: checkId },
        data: {
          lastCheckAt: new Date(),
          lastStatus: success ? 'up' : 'down',
          failureCount: success ? 0 : { increment: 1 },
        },
      });

      console.log(`💾 Result saved: ${success ? '✅' : '❌'} ${latencyMs}ms`);

      // Si falló, disparar alerta
      if (!success) {
        await alertService.handleFailure(checkId, checkResult.id);
      }

      return {
        success,
        statusCode,
        latencyMs,
        checkResultId: checkResult.id,
      };

    } catch (dbError: any) {
      console.error(`❌ Database error for check ${checkId}:`, dbError.message);
      throw dbError;
    }
  }

  async start() {
    console.log('🚀 Worker started and listening for jobs...');
  }

  async stop() {
    await this.worker.close();
    console.log('🛑 Worker stopped');
  }
}