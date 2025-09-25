# HawkPulse Backend

API REST backend desarrollada con Node.js, TypeScript y Express.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **TypeScript** - Superset tipado de JavaScript
- **Express.js** - Framework web para Node.js
- **CORS** - Middleware para habilitar Cross-Origin Resource Sharing
- **Helmet** - Middleware de seguridad
- **Morgan** - Logger de peticiones HTTP
- **dotenv** - Manejo de variables de entorno

## 📁 Estructura del Proyecto

```
hawkpulse-backend/
├── src/
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts
├── dist/                  # Archivos compilados (generado)
├── .env.example          # Variables de entorno de ejemplo
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus configuraciones.

3. **Configurar base de datos:**
   ```bash
   # Generar cliente de Prisma
   npm run db:generate
   
   # Crear y aplicar migraciones
   npm run db:migrate
   
   # O alternativamente, sincronizar schema (desarrollo)
   npm run db:push
   ```

4. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

6. **Ejecutar en producción:**
   ```bash
   npm start
   ```

## 🔧 Scripts Disponibles

- `npm run dev` - Ejecuta el servidor en modo desarrollo con recarga automática
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Ejecuta el servidor en modo producción
- `npm run clean` - Limpia la carpeta dist
- `npm run db:generate` - Genera el cliente de Prisma
- `npm run db:push` - Sincroniza el schema con la base de datos
- `npm run db:migrate` - Crea y aplica migraciones
- `npm run db:studio` - Abre Prisma Studio para gestión visual de la BD

## 📡 Endpoints Disponibles

### Health Check
- **GET** `/health` - Verifica el estado del servidor

### API Base
- **GET** `/api` - Información general de la API

### Usuarios
- **POST** `/api/users/register` - Registro de nuevos usuarios
- **GET** `/api/users/profile` - Obtener perfil de usuario (próximamente)

### Autenticación
- **POST** `/api/auth/login` - Placeholder para login

## 🌐 Configuración del Servidor

El servidor está configurado para ejecutarse en el puerto **3000** por defecto.

Una vez iniciado, estará disponible en:
- **URL local:** `http://localhost:3000`
- **Health check:** `http://localhost:3000/health`
- **API base:** `http://localhost:3000/api`

## 📋 Próximos Pasos

Este boilerplate está listo para:
- ✅ Manejar peticiones HTTP
- ✅ Middleware de seguridad y logging
- ✅ Manejo de errores
- ✅ Estructura escalable
- ⏳ Integración con base de datos
- ⏳ Autenticación y autorización
- ⏳ Validación de datos
- ⏳ Tests unitarios e integración

## 🤝 Contribución

Para contribuir al proyecto, por favor crea una rama desde `main` y envía un Pull Request.

## 📄 Licencia

ISC