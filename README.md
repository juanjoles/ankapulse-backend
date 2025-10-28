# AnkaPulse Backend

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
AnkaPulse-backend/
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
   Edita el archivo `.env` con tus configuraciones:
   - Variables de base de datos PostgreSQL
   - JWT secret para tokens locales
   - **Auth0**: Domain, Client ID, Client Secret (para Google/GitHub)

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

### Usuarios (Sistema tradicional)
- **POST** `/api/users/register` - Registro con email/password
- **GET** `/api/users/profile` - Obtener perfil (protegida con JWT)

### Autenticación Tradicional
- **POST** `/api/auth/login` - Login con email/password (próximamente)
- **POST** `/api/auth/logout` - Logout tradicional (próximamente)

### Autenticación Social (Auth0 + OAuth)
- **GET** `/auth/login/google` - Login con Google
- **GET** `/auth/login/github` - Login con GitHub
- **GET** `/auth/callback` - Callback de Auth0 (automático)
- **POST** `/auth/logout/auth0` - Logout de Auth0
- **GET** `/auth/info` - Información de configuración Auth0

## 🌐 Configuración del Servidor

El servidor está configurado para ejecutarse en el puerto **3000** por defecto.

Una vez iniciado, estará disponible en:
- **URL local:** `http://localhost:3000`
- **Health check:** `http://localhost:3000/health`
- **API base:** `http://localhost:3000/api`

## 🔐 Configuración Auth0 (OAuth Social)

### Prerrequisitos Auth0:
1. **Cuenta en Auth0**: Regístrate en https://auth0.com
2. **Crear aplicación**: Regular Web Application
3. **Configurar proveedores sociales**:
   - Google: Client ID/Secret desde Google Cloud Console
   - GitHub: Client ID/Secret desde GitHub OAuth Apps

### Variables Auth0 requeridas (.env):
```bash
# Auth0 Configuration
AUTH0_DOMAIN=tu-dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id  
AUTH0_CLIENT_SECRET=tu_client_secret
AUTH0_CALLBACK_URL=http://localhost:3000/auth/callback
AUTH0_AUDIENCE=
```

### Configuración Auth0 Dashboard:
- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Web Origins**: `http://localhost:3000`
- **Allowed Logout URLs**: `http://localhost:3000`

## 🔄 Flujo de Autenticación Híbrido

### Sistema Tradicional (Mantiene funcionamiento actual):
1. `POST /api/users/register` → Usuario + Token JWT local
2. `GET /api/users/profile` → Funciona con token local

### Sistema Auth0 Social (Nuevo):
1. `GET /auth/login/google` → Redirige a Google via Auth0
2. Usuario autoriza en Google
3. `GET /auth/callback` → Procesa respuesta automáticamente
4. Retorna: Usuario + Token JWT **compatible** con sistema actual
5. `GET /api/users/profile` → **Funciona igual** con ambos tipos de token

**✅ Compatibilidad total**: El mismo endpoint `/api/users/profile` funciona para usuarios creados con email/password Y usuarios de Google/GitHub.

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