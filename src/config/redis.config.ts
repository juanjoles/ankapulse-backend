import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Conexión a Redis
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Manejar eventos de conexión
connection.on('connect', () => {
  console.log('✅ Redis connected');
});

connection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Cola de monitoreo
export const monitorQueue = new Queue('monitor-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

export { connection };