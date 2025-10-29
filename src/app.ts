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

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// LOGS DE DEBUG EXPANDIDOS
console.log('🔍 ===== ENVIRONMENT VARIABLES DEBUG =====');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('PORT:', process.env.PORT);

// Verificar variables críticas
console.log('🔍 Variables críticas:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTE ✅' : 'NO EXISTE ❌');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'EXISTE ✅' : 'NO EXISTE ❌');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NO DEFINIDA ❌');
console.log('BACKEND_URL:', process.env.BACKEND_URL || 'NO DEFINIDA ❌');

// Debug adicional - listar TODAS las variables disponibles
console.log('🔍 Total de variables de entorno disponibles:', Object.keys(process.env).length);
console.log('🔍 Variables que contienen "DATABASE":', Object.keys(process.env).filter(key => key.includes('DATABASE')));
console.log('🔍 Variables que contienen "REDIS":', Object.keys(process.env).filter(key => key.includes('REDIS')));
console.log('🔍 Variables que contienen "URL":', Object.keys(process.env).filter(key => key.includes('URL')));

// Intentar acceso directo
console.log('🔍 Acceso directo a DATABASE_URL:', process.env['DATABASE_URL']);
console.log('🔍 Acceso directo a REDIS_URL:', process.env['REDIS_URL']);

// Verificar si hay variables con nombres similares
const allVars = Object.keys(process.env);
console.log('🔍 Primeras 10 variables disponibles:', allVars.slice(0, 10));

console.log('🔍 ======================================');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
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
  delayMs: (hits, req) => {
    const delayAfter = req.slowDown.limit;
    return (hits - delayAfter) * 500;
  }, // Configuración actualizada para evitar el warning
  maxDelayMs: 5000, // máximo delay de 5 segundos
});

app.use(cors({
  origin: [
    'http://localhost:3001', 
    'http://localhost:3000', 
    'http://127.0.0.1:3001', 
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter((v): v is string => Boolean(v)), // Filtrar valores undefined con type-guard
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
app.use('/api',  routes);

// Rutas Auth0 - van en el root para evitar conflictos (NUEVO)
app.use('/auth',  auth0Routes);

// Integrando las rutas de checks en la aplicación principal
app.use('/api', checksRoutes);

// Ruta de health check (MANTENER)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AnkaPulse Backend is running',
    timestamp: new Date().toISOString(),
    authentication: 'Híbrido: Local JWT + Auth0 Social',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasDatabase: !!process.env.DATABASE_URL,
      hasRedis: !!process.env.REDIS_URL,
      hasFrontendUrl: !!process.env.FRONTEND_URL
    }
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
  
  // Verificar variables críticas antes de inicializar servicios
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no encontrada. Servicios no se pueden inicializar.');
    return;
  }
  
  if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL no encontrada. Worker no se puede inicializar.');
    return;
  }
  
  try {
    // Iniciar worker
    await workerService.start();
    
    // Sincronizar checks existentes
    await schedulerService.syncChecks();
    
    console.log('✅ All services initialized');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    throw error;
  }
}

// Llamar a la inicialización
initializeServices().catch((error) => {
  console.error('❌ Failed to initialize services:', error);
  // No terminar el proceso, solo el worker falla
  console.log('⚠️ Continuing without worker services...');
});

// Manejar cierre graceful
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  try {
    await workerService.stop();
  } catch (error) {
    console.error('Error stopping worker:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  try {
    await workerService.stop();
  } catch (error) {
    console.error('Error stopping worker:', error);
  }
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;