import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';
import auth0Routes from './routes/auth0Routes';
import checksRoutes from './routes/checks.routes';
import { errorHandler } from './middleware/errorHandler';
import { WorkerService } from './services/worker.service';
import { SchedulerService } from './services/scheduler.service';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad y utilidad
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas principales de API (MANTENER)
app.use('/api', routes);

// Rutas Auth0 - van en el root para evitar conflictos (NUEVO)
app.use('/auth', auth0Routes);

// Integrando las rutas de checks en la aplicación principal
app.use('/api', checksRoutes);

// Ruta de health check (MANTENER)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HawkPulse Backend is running',
    timestamp: new Date().toISOString(),
    authentication: 'Híbrido: Local JWT + Auth0 Social'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar Worker y Scheduler
const workerService = new WorkerService();
const schedulerService = new SchedulerService();

async function initializeServices() {
  console.log('🚀 Initializing HawkPulse services...');
  
  // Iniciar worker
  await workerService.start();
  
  // Sincronizar checks existentes
  await schedulerService.syncChecks();
  

console.log('✅ All services initialized');
  console.log('✅ All services initialized');
}

// Llamar a la inicialización
initializeServices().catch((error) => {
  console.error('❌ Failed to initialize services:', error);
  process.exit(1);
});

// Manejar cierre graceful
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await workerService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await workerService.stop();
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;