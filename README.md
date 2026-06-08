# Portafolio Academico Web

Portafolio academico con enfoque SENA para gestion de fichas, competencias, RA, evidencias, asistencia y modulos avanzados.

## Estado actual

- Autenticacion server-side con sesion en cookie HTTP-only.
- Persistencia hibrida JSON + PostgreSQL (servidor).
- Bootstrap de administrador por defecto (`admin/password`) con cambio obligatorio recomendado.
- Evidencias hibridas:
  - URL externa.
  - Subida de archivo via API local (`/api/evidences/upload`).
- Endpoint de prueba de notificaciones por Resend (`/api/notifications/test`).
- Fase 2:
  - Reporte de evidencias CSV (`/api/reports/evidencias.csv`).
  - Reporte de avance por RA CSV (`/api/reports/ra.csv`).
  - Auditoria reciente (`/api/audit/recent`) y registro de eventos clave.
- Fase 3:
  - Gestion de cuentas de acceso en DB desde panel admin.
  - Sincronizacion de cuentas instructor/aprendiz desde ficha.
  - Reset de contrasenas temporales y activacion/desactivacion de cuentas.
- Fase 4:
  - Recuperacion de contrasena por correo (Resend).
  - Enlaces de restablecimiento con token temporal (30 min).
  - Pantalla de cambio en `/reset-password`.
- Fase 5 (inicial):
  - Semaforo de riesgo por aprendiz (alto/medio/bajo) segun asistencia y avance.
  - Endpoint analitico para seguimiento docente.

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- npm 10+

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Minimo requerido:

- `DATABASE_URL`
- `AUTH_SECRET` (32+ caracteres)

Opcional:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `AUTH_BOOTSTRAP_ADMIN_EMAIL`
- `APP_URL`

## Instalacion

```bash
npm install
npm run dev
```

App: `http://localhost:3000`

## Acceso inicial

- Usuario admin bootstrap: `admin`
- Contrasena bootstrap: `password` (o la que configures en `AUTH_BOOTSTRAP_ADMIN_PASSWORD`)

Recomendado: cambiarla de inmediato desde **Panel > Configuracion > Seguridad**.

## Arquitectura resumida

- Frontend: Next.js App Router + React.
- Auth:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
  - `POST /api/auth/change-password`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- Datos portafolio:
  - `GET /api/portfolio/hybrid`
  - `POST /api/portfolio/hybrid`
- Evidencias:
  - `POST /api/evidences/upload`
  - `GET /api/evidences/local/:filename`
- Notificaciones:
  - `POST /api/notifications/test` (admin + Resend)
- Reportes:
  - `GET /api/reports/evidencias.csv?fichaId=<id>`
  - `GET /api/reports/ra.csv?fichaId=<id>`
- Auditoria:
  - `GET /api/audit/recent?limit=40`
- Analitica:
  - `GET /api/analytics/risk?fichaId=<id>`
- Cuentas admin:
  - `GET /api/admin/users`
  - `POST /api/admin/users` body `{ "action": "sync_from_ficha" }`
  - `PATCH /api/admin/users/:id` body:
    - `{ "action": "reset_password", "newPassword": "...", "mustChangePassword": true }`
    - `{ "action": "set_active", "isActive": true|false }`
- Pantalla de recuperacion:
  - `GET /reset-password?token=...`

## Despliegue

### Vercel

1. Importa el repositorio.
2. Configura variables de entorno en Project Settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_BOOTSTRAP_ADMIN_USER`
   - `AUTH_BOOTSTRAP_ADMIN_PASSWORD`
   - `AUTH_BOOTSTRAP_ADMIN_NAME`
   - (opcional) `AUTH_BOOTSTRAP_ADMIN_EMAIL`, `APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
3. Deploy.

Nota importante: la subida local de archivos usa filesystem (`data/uploads`) y en serverless puede ser efimera. Para produccion robusta en Vercel, usa URL externas o integra almacenamiento persistente (S3/Blob) en siguiente fase.

### Otros hosts (Docker/VM/PaaS)

Funciona en cualquier host Node.js con PostgreSQL y disco persistente.

## Seguridad aplicada en esta fase

- Sesion en cookie HTTP-only, sin `localStorage` para autenticacion.
- Login validado en servidor.
- API hibrida protegida por rol.
- Passwords hasheadas con `bcryptjs`.
- Auditoria basica de eventos de login en tabla `auth_audit`.

## Comandos utiles

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run verify
```
