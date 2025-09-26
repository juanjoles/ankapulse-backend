Implementación de funcionalidad de creación de checks para HawkPulse MVP
Necesito implementar la funcionalidad core para que los usuarios puedan crear checks de monitoreo de URLs/APIs en HawkPulse. Esta es la característica principal del MVP, por lo que debe seguir las mejores prácticas y alinearse con la arquitectura Express + TypeScript + Prisma existente.
CONTEXTO DEL PROYECTO:
HawkPulse es una plataforma de monitoreo de APIs que mide uptime y latencia desde múltiples regiones. Stack actual: Express + TypeScript + Prisma + PostgreSQL. El sistema de autenticación ya está implementado con JWT.
ESTRUCTURA ACTUAL DEL PROYECTO:

Express server en src/app.ts
Rutas en src/routes/
Controladores en src/controllers/
Servicios en src/services/
Middleware de autenticación en src/middleware/auth.ts
Validaciones con Joi en src/middleware/validation.ts
Prisma cliente en src/models/prisma.ts
Utilities en src/utils/

REQUISITOS ESPECÍFICOS:

Modelo de datos Prisma (Check) - Agregar al schema.prisma:

prismamodel Check {
  id                   String   @id @default(uuid())
  userId               String
  url                  String
  name                 String?
  interval             String   // '5min', '1hour', '1day'
  regions              String[] // ['sao-paulo', 'new-york', 'frankfurt']
  status               String   @default("active") // 'active', 'paused', 'failed'
  timeout              Int      @default(30) // segundos
  expectedStatusCode   Int      @default(200)
  lastCheckAt          DateTime?
  lastStatus           String?  // 'up', 'down', 'timeout'
  failureCount         Int      @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("checks")
}

Endpoint API:

POST /api/checks - Crear nuevo check
Usar autenticación existente (authenticateToken middleware)
Seguir estructura de respuesta API existente del proyecto
Rate limiting por usuario (máximo 10 checks por usuario en MVP)


Validaciones Joi (agregar a validation.ts):

URL: formato válido HTTP/HTTPS + test de accesibilidad con HEAD request
Interval: solo valores MVP ('5min', '1hour', '1day')
Regions: array con valores ['sao-paulo', 'new-york', 'frankfurt']
Timeout: rango 5-120 segundos
Name: opcional, máximo 100 caracteres


Arquitectura de files a crear/modificar:

src/controllers/checkController.ts - Controller con método createCheck
src/services/checkService.ts - Service layer para lógica de negocio
src/routes/checkRoutes.ts - Rutas de checks
Modificar src/routes/index.ts para incluir checkRoutes
Modificar src/middleware/validation.ts para agregar validateCheckCreation
Agregar tipos en src/types/index.ts para Check interfaces
Función utility para validar URL accesibilidad


Estructura de Response API (mantener consistencia):

typescript// Success response
{
  status: 'success',
  message: 'Check creado exitosamente',
  data: {
    check: {
      id: "uuid",
      url: "https://api.example.com",
      name: "API Example",
      interval: "5min",
      regions: ["sao-paulo", "new-york"],
      status: "active",
      // ... otros campos
    }
  }
}

// Error response
{
  status: 'error',
  message: 'URL no es accesible',
  errors?: ['Detalles del error']
}

Sistema de monitoreo básico (preparación):

Función básica para ejecutar un check individual (simular worker)
Logging consistente con morgan existente
Preparar estructura para BullMQ/Redis futuro



INTEGRACIÓN CON CÓDIGO EXISTENTE:

Usar AuthenticatedRequest interface existente en auth.ts
Seguir patrón de UserController y UserService
Usar prisma client existente de src/models/prisma.ts
Mantener estructura de validación con Joi como en validateUserRegistration
Usar utilities existentes (JWT, password si aplicable)

VALIDACIÓN DE URL REQUERIDA:

Verificar formato HTTP/HTTPS
Hacer HEAD request para verificar accesibilidad (timeout 10 segundos)
Manejar errores de red apropiadamente

MEJORES PRÁCTICAS A SEGUIR:

Mantener consistencia con el código existente
TypeScript estricto como en el proyecto
Manejo de errores siguiendo patrón del errorHandler existente
Transacciones Prisma donde sea necesario
Logging detallado para debugging
Preparar para escalabilidad hacia workers distribuidos

IMPORTANTE:

NO modificar funcionalidad existente (users, auth, etc.)
Mantener estructura de carpetas y naming conventions
Usar middleware de autenticación existente
Seguir patrón de respuestas API del proyecto
Preparar para integración futura con BullMQ según documentación

ENTREGABLES:

Migración Prisma para modelo Check + relación con User
Tipos TypeScript para Check y DTOs
Controller checkController.ts con método createCheck
Service checkService.ts con lógica de negocio
Routes checkRoutes.ts con POST /checks
Validación validateCheckCreation en validation.ts
Utility para validación de URL
Actualización de routes/index.ts
Tests básicos de validación (opcional)

¿Puedes implementar esta funcionalidad core de HawkPulse manteniendo la calidad del código existente y preparándola para escalar según la arquitectura MVP planificada?