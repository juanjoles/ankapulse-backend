import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

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

// Rutas principales
app.use('/api', routes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HawkPulse Backend is running',
    timestamp: new Date().toISOString()
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;