# AGENTS.md — mundointerino-backend

NestJS 11, Node ≥20, repo git propio..Patrón feature-module bajo `src/modules/<feature>/` con `*.module/controller/service/dto`. DB Postgres (TypeORM) + herencia Mongo aún activa durante migración.

## Comandos

- `npm run dev` → `nest start --watch`, escucha en `0.0.0.0:8080` (puerto via `PORT` o default `src/main.ts`).
- `npm run build` → `dist/` (Nest CLI, `deleteOutDir: true`).
- `npm start` / `npm run start:prod` → `node dist/src/main`.
- `npm run lint` → eslint `--fix` sobre `{src,test}/**/*.ts`. Flat config en `eslint.config.js` (eslint v9 + `@typescript-eslint`). Reglas notables: `no-undef` off (TS ya cubre), `no-require-imports` off (carga perezosa de deps opcionales), `no-useless-escape` off (regex en DTOs). Warnings aceptados: `@typescript-eslint/no-explicit-any` y `no-unused-vars` (warn).
- `npm run format` → prettier sobre `src/**/*.ts` **solo** (no toca tests).
- `npm test` → jest, regex `test/unit/.*\\.spec\\.ts|src/.*\\.spec\\.ts`. Un sólo archivo: `npx jest <path>`; un solo test por nombre: `npx jest -t "<nombre>"`.
- `npm run test:cov` → coverage en `coverage/`.
- `npm run test:e2e` → usa `test/jest-e2e.json`, archivos en `test/e2e/*.e2e-spec.ts`.

## TypeScript / paths

- Alias `@/*` → `src/*` declarado en `tsconfig.json` pero **no mapeado en jest** (`package.json # jest`). En tests usá imports relativos o los `.spec` no resuelven.
- `noImplicitAny: false`, `strictNullChecks: true`, target ES2022, CommonJS.

## Pipeline HTTP (`src/main.ts`)

- `ValidationPipe` global con `whitelist + forbidNonWhitelisted + transform` (`enableImplicitConversion: false`). **Cualquier campo no declarado en el DTO se rechaza 400.** Mantener DTOs sincronizados con el frontend.
- `ThrottlerGuard` global: 60 req/min por IP (ThrottlerModule en `app.module.ts`).
- `AllExceptionsFilter` global.
- CORS: `ALLOWED_ORIGINS` (CSV en `.env`) + cualquier `*.vercel.app`. `credentials: true`. Default `http://localhost:5173,5174`.
- `express.set('trust proxy', 1)` — necesario en Railway.
- Self-ping a `/api/health` cada 4 min si `RAILWAY_PUBLIC_DOMAIN` está seteado; no romper ese endpoint.

## Base de datos — migración Mongo → Postgres

- `PostgresDatabaseModule` (`src/database/postgres.module.ts`) con TypeORM y **`synchronize: true`**: las entidades (`src/database/entities/*.entity.ts`) sincronizan el schema en el arranque. **No hay migrations runner**; no agregues uno sin reemplazar `synchronize`.
- `entities` registradas: `RefreshTokenEntity, ImpersonationAuditEntity, CiudadEntity, UsuarioEntity, PisoEntity, AnuncioEntity`.
- Mongoose (`mongoose` dep) sigue activo para lectura legacy. Flags en `.env`:
  - `READ_USUARIOS_FROM=mongo|pg`, `READ_PISOS_FROM=mongo|pg`, `WRITE_MONGO=true|false`, `BACKFILL_BATCH_SIZE`.
- Postgres local esperado en **puerto 5433** (ver `.env`, no el default 5432). `DATABASE_URL` obligatoria o el boot del módulo Postgres falla.
- Script de migración puntual: `npx ts-node scripts/migrate-mongo-to-pg.ts` (requiere `MONGO_URI` y `DATABASE_URL`).

## Scripts operacionales (`scripts/`)

Todos corren con `ts-node` y cargan `dotenv/config` automáticamente.

- `seed-ciudades.ts` — pobla `CiudadEntity` desde `scripts/ES.txt` + `*.sql` (UTF-16 via `iconv-lite`). **Lo ejecuta Railway en cada deploy** (ver `railway.json` `startCommand`).
- `promote-admin.ts <USER_ID>` — sube un usuario a rol admin (aún opera sobre Mongo, no Postgres).
- `reset-upload-limit.ts` — resetea cuota de uploads de un usuario.
- `migrate-mongo-to-pg.ts` — migración one-shot de usuarios/pisos/anuncios.

## Auth

- JWT access + refresh. Access en header `Authorization`, refresh en cookie httpOnly + entidad `RefreshTokenEntity` (Postgres).
- Secrets OBLIGATORIOS: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiraciones `JWT_ACCESS_EXPIRES`/`JWT_REFRESH_EXPIRES`.
- Cookies: `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE` (valores dev en `.env`).
- Módulos: `modules/auth` (login/refresh/logout/me), `modules/usuarios` (perfil/verificación).

## Verificación de usuarios (OCR) — `modules/automated-verification`

- `OCR_PROVIDER` default **`tesseract`** en `config/verification.config.ts`; `.env` lo sobreescribe a `google-vision` con `OCR_FALLBACK_PROVIDER=tesseract`. Si Google Vision no tiene credenciales, la factory cae a Tesseract (`ocr-provider.factory.ts:24-27`).
- Credenciales Google: `GOOGLE_APPLICATION_CREDENTIALS` (ruta a `google-service-account.json`, gitignored) **o** `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON inline; `main.ts` lo escribe a la ruta al boot). En Railway usá la inline.
- `spa.traineddata` en la raíz del subproyecto es datos de entrenamiento Tesseract; no borrar.
- Reglas y thresholds en `.env` (`VERIFICATION_*`) y `modules/automated-verification/rules/verification-rules.ts`.
- Dispatcher con retries exponenciales (`MAX_RETRIES`, `BASE_DELAY_MS`, `MAX_DELAY_MS`).

## Cola (BullMQ / Redis)

- `@nestjs/bullmq` + `ioredis`. `REDIS_URL` en `.env` (vacío en dev local deshabilita colas implícitamente — revisar módulos que dependan de BullMQ antes de arrancar).

## Deploy Railway (`railway.json`)

- Build: `npm install --include=dev && npm run build`, copia `scripts/*.sql` + `scripts/ES.txt` a `dist/scripts/`.
- Start: `node dist/scripts/seed-ciudades.js && node dist/src/main` — la seed corre en **cada** deploy. Mantenerla idempotente.
- `restartPolicyType: ON_FAILURE`, max 10 retries.

## Env local

`.env` ya está poblado para dev (Postgres `localhost:5433`, Cloudinary, Resend). Copia el archivo si falta; **no commitearlo** (está en `.gitignore`). `google-service-account.json` también gitignored.

## Skills opencode relevantes (`.agents/skills/`)

- `nestjs-best-practices` — reglas de arquitectura NestJS (feature modules, DI, exception filters, guards).
- `nodejs-backend-patterns` — patrones avanzados backend.
- `typescript-advanced-types` — tipos TS.

Cargá el skill `nestjs-best-practices` antes de estructurar módulos nuevos.