import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
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


app.use(compression());

// Middlewares de seguridad y utilidad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting Global - Protección general
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting para Autenticación - MÁS ESTRICTO
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de login por IP
  message: {
    error: 'Demasiados intentos de autenticación, intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
});

// Rate Limiting para API - MODERADO
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto por IP
  message: {
    error: 'Límite de API excedido, intenta nuevamente en 1 minuto.',
    retryAfter: '1 minuto'
  },
});

// Slow Down - Ralentizar requests progresivamente
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // permitir 50 requests sin delay
  delayMs: 500, // agregar 500ms de delay por cada request adicional
  maxDelayMs: 5000, // máximo delay de 5 segundos
});

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));

// Aplicar rate limiting global
app.use(globalLimiter);
app.use(speedLimiter);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas principales de API (MANTENER)
app.use('/api', apiLimiter, routes);

// Rutas Auth0 - van en el root para evitar conflictos (NUEVO)
app.use('/auth', authLimiter, auth0Routes);

// Integrando las rutas de checks en la aplicación principal
app.use('/api', apiLimiter, checksRoutes);

// Ruta de health check (MANTENER)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AnkaPulse Backend is running',
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
  console.log('🚀 Initializing AnkaPulse services...');
  
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