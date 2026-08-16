# GlowBook — Salon & Spa Booking Platform

A production-quality, full-stack **Salon & Spa Appointment Booking Platform** built as a monorepo. GlowBook enables customers to discover salons, book appointments, pay online, and manage their experience — while giving salon owners powerful tools to manage their business.

---

## Overview

| App | Technology | Port |
|-----|-----------|------|
| **API** (Backend) | NestJS + PostgreSQL + Prisma | 3001 |
| **Web Dashboard** | React + Vite + Tailwind | 5173 |
| **Mobile App** | React Native + Expo | Expo Go |

---

## Features

### Customer
- Browse and search salons by location, category, rating, price
- View services, staff, pricing, and real-time availability
- Multi-step booking flow with coupon support
- Stripe payment integration
- Appointment management (reschedule, cancel)
- QR code check-in
- Push & in-app notifications
- Reviews and ratings
- Favorite salons

### Salon Owner
- Full business dashboard
- Calendar view (day/week) with per-staff slots
- Appointment management with status tracking
- Service and staff management
- Working hours and holidays configuration
- Customer management
- Coupon/offer campaigns
- Revenue and performance analytics

### Platform
- Multi-tenant architecture (each salon is isolated)
- Role-based access control (Customer, Owner, Staff, Admin)
- Real-time WebSocket events (Socket.IO)
- Scheduled notifications (reminders, review requests)
- Admin panel for platform management

---

## Architecture

```
glowbook/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── salons/
│   │   │   │   ├── services/
│   │   │   │   ├── staff/
│   │   │   │   ├── availability/
│   │   │   │   ├── appointments/
│   │   │   │   ├── payments/
│   │   │   │   ├── reviews/
│   │   │   │   ├── notifications/
│   │   │   │   ├── favorites/
│   │   │   │   ├── analytics/
│   │   │   │   ├── coupons/
│   │   │   │   └── admin/
│   │   │   ├── gateway/     # WebSocket gateway
│   │   │   └── prisma/      # Database client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── web/                 # React dashboard
│   │   └── src/
│   │       ├── pages/       # Route pages
│   │       ├── features/    # Feature-specific hooks
│   │       ├── shared/      # Shared components, utilities
│   │       └── styles/
│   └── mobile/              # React Native app
│       ├── app/             # Expo Router screens
│       └── src/             # Shared utilities
└── packages/
    ├── shared-types/        # Shared TypeScript types
    └── validation/          # Shared Zod schemas
```

---

## Tech Stack

### Backend
- **NestJS** — Modular Node.js framework
- **PostgreSQL** — Relational database
- **Prisma** — Type-safe ORM
- **JWT** — Access tokens (15m) + Refresh tokens (7d)
- **Socket.IO** — Real-time WebSocket events
- **Stripe** — Payment processing
- **@nestjs/schedule** — Cron jobs for notifications

### Web Dashboard
- **React 18** + **TypeScript**
- **Vite** — Fast build tooling
- **Tailwind CSS** + **shadcn/ui** design system
- **TanStack Query** — Server state management
- **Zustand** — Client state (auth, active salon)
- **React Hook Form** + **Zod** — Form validation
- **Recharts** — Analytics charts

### Mobile App
- **React Native** + **Expo**
- **Expo Router** — File-based routing
- **TanStack Query** — Data fetching
- **Zustand** + **AsyncStorage** — Persisted auth state

### Shared Packages
- `@glowbook/shared-types` — TypeScript interfaces shared across apps
- `@glowbook/validation` — Zod schemas shared across apps

---

## Database Schema

Key entities and relationships:

```
User ──────────── owns ──────── Salon
                                  │
                   ┌──────────────┼──────────────┐
                   │              │               │
                 Staff         Service      WorkingHour
                   │              │
                   └─────── Appointment ──── Payment
                                  │              │
                               Review         Refund
```

Full entity list: `User`, `RefreshToken`, `SalonCategory`, `Salon`, `SalonImage`, `WorkingHour`, `SalonHoliday`, `Staff`, `StaffService`, `StaffLeave`, `ServiceCategory`, `Service`, `Appointment`, `AppointmentStatusHistory`, `Payment`, `Refund`, `Coupon`, `Review`, `Notification`, `DeviceToken`, `Favorite`, `AuditLog`

---

## API Overview

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/salons
GET    /api/v1/salons/:id
POST   /api/v1/salons
PATCH  /api/v1/salons/:id
GET    /api/v1/salons/mine

GET    /api/v1/salons/:id/services
POST   /api/v1/salons/:id/services
PATCH  /api/v1/services/:id
DELETE /api/v1/services/:id

GET    /api/v1/salons/:id/staff
POST   /api/v1/salons/:id/staff
PATCH  /api/v1/staff/:id

GET    /api/v1/availability?salonId&serviceId&date[&staffId]

POST   /api/v1/appointments
GET    /api/v1/appointments
GET    /api/v1/appointments/:id
PATCH  /api/v1/appointments/:id/status
POST   /api/v1/appointments/:id/cancel
POST   /api/v1/appointments/:id/reschedule
POST   /api/v1/appointments/qr-checkin

POST   /api/v1/payments/create-intent
POST   /api/v1/payments/confirm
POST   /api/v1/payments/refund
GET    /api/v1/payments/history

POST   /api/v1/appointments/:id/review
GET    /api/v1/salons/:id/reviews

GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read

GET    /api/v1/analytics/summary
GET    /api/v1/analytics/revenue
GET    /api/v1/analytics/services
GET    /api/v1/analytics/staff-performance
GET    /api/v1/analytics/peak-hours

GET    /api/v1/favorites
POST   /api/v1/favorites/:salonId
DELETE /api/v1/favorites/:salonId

POST   /api/v1/coupons/validate
```

**Swagger docs:** `http://localhost:3001/api/docs`

---

## Appointment State Machine

```
PENDING ──→ CONFIRMED ──→ ARRIVED ──→ IN_PROGRESS ──→ COMPLETED
   │              │
   └──────────────┴──→ CANCELLED
                   └──→ NO_SHOW
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm 10+

### 1. Clone and install

```bash
git clone https://github.com/your-org/glowbook.git
cd glowbook
npm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/api/.env` with your PostgreSQL credentials and JWT secrets.

### 3. Set up database

```bash
npm run db:push    # Push schema to database
npm run db:seed    # Seed with realistic demo data
```

### 4. Run development servers

```bash
# Run all apps simultaneously
npm run dev

# Or individually:
cd apps/api && npm run dev       # API on :3001
cd apps/web && npm run dev       # Dashboard on :5173
cd apps/mobile && npm start      # Expo mobile app
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (default: 7d) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `EMAIL_API_KEY` | SendGrid / email provider key |
| `MAPS_API_KEY` | Google Maps API key |
| `STORAGE_URL` | File storage endpoint |

---

## Testing

```bash
# Unit tests
cd apps/api && npm test

# Watch mode
cd apps/api && npm run test:watch

# Coverage
cd apps/api && npm run test:cov
```

Key test files:
- `src/modules/availability/availability.service.spec.ts` — Availability engine tests

---

## Demo Accounts

All demo accounts use password: **`GlowBook2024`**

| Role | Email |
|------|-------|
| Customer | customer@glowbook.demo |
| Salon Owner | owner@glowbook.demo |
| Staff | staff@glowbook.demo |
| Platform Admin | admin@glowbook.demo |

---

## Seeded Data

- 5 realistic salons across India (Chennai, Hyderabad, Bengaluru, Mumbai, Delhi)
- 9 staff members with services and working hours
- 13+ services across categories (hair, skin, massage, nails)
- 11 customer accounts
- 500+ appointments (past and upcoming)
- Reviews with realistic comments
- Active coupon codes: `WELCOME20`, `GLOW200`, `SPA15`

---

## Deployment

### Recommended setup (GitHub)

- Deploy backend (`apps/api`) to a Node host (Render, Railway, Fly.io, EC2, etc.)
- Deploy frontend (`apps/web`) to a static/web host (Vercel, Netlify, Cloudflare Pages)
- Build mobile (`apps/mobile`) with EAS (Expo cloud)

### 1) Backend deploy checklist (`apps/api`)

- Root directory: `apps/api`
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN` (example: `15m`)
- `JWT_REFRESH_EXPIRES_IN` (example: `7d`)
- `PORT` (hosting platform may inject this automatically)
- `NODE_ENV=production`
- `ALLOWED_ORIGINS` (comma-separated deployed frontend origins)

Optional/feature-specific variables:

- `STRIPE_SECRET_KEY`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `STORAGE_URL`
- `STORAGE_KEY`
- `STORAGE_SECRET`
- `MAPS_API_KEY`

After first deploy, run schema + seed against production database:

```bash
cd apps/api
npx prisma db push
npx prisma db seed
```

### 2) Frontend deploy checklist (`apps/web`)

- Root directory: `apps/web`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variables:

- `VITE_API_URL=https://<your-api-domain>/api/v1`
- `VITE_DEMO_MODE=false`

Important:

- Do not keep `VITE_API_URL` on localhost after deploy.
- Add your frontend URL to backend `ALLOWED_ORIGINS`.

### 3) Mobile build checklist (`apps/mobile`)

Use EAS cloud build (recommended):

```bash
cd apps/mobile
npm_config_cache="$TMPDIR/npm-cache" npx --yes eas-cli login
npm_config_cache="$TMPDIR/npm-cache" npx --yes eas-cli build -p android --profile preview --clear-cache
```

Notes:

- This repo is already linked to EAS project `@akajith555/glowbook`.
- If build fails, check the `Run gradlew` phase in Expo build logs.

### 4) Will frontend and backend work when deployed from GitHub?

Yes, they work when both are deployed with the correct env wiring:

- Backend is live and database is reachable.
- Frontend `VITE_API_URL` points to deployed backend.
- Backend `ALLOWED_ORIGINS` includes deployed frontend domain.

If any of these are missing, login/data calls can fail due to CORS or wrong API URL.

### 5) GitHub Actions auto-deploy setup

This repository includes two workflows:

- `.github/workflows/backend-ci-deploy.yml`
- `.github/workflows/web-ci-deploy.yml`

They run build checks on push.

- Backend workflow: optional deploy via webhook.
- Web workflow: deploys directly to GitHub Pages.

Configure repository secrets in GitHub:

- `API_DEPLOY_HOOK_URL`: backend deploy webhook (Render/Railway/Fly or your host)
- `VITE_API_URL`: deployed backend URL with `/api/v1` suffix (example: `https://api.example.com/api/v1`)

Branch trigger:

- `main`
- `ajithkumarkasi-work`

If the hook secrets are not set, workflows still run CI build checks but skip deploy steps.

For GitHub Pages, enable Pages in repository settings:

- Settings -> Pages -> Build and deployment -> Source: `GitHub Actions`

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15m) + rotating refresh tokens (7d)
- Role-Based Access Control (RBAC) on every endpoint
- Multi-tenant isolation — salon owners can only access their own data
- Input validation with class-validator and Zod
- Rate limiting (100 requests/minute)
- Helmet security headers
- No sensitive payment data stored (Stripe handles card data)
- QR check-in validated server-side

---

## Real-time Events (WebSocket)

Connect to `ws://localhost:3001` with a JWT token in the auth handshake.

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:salon` | Client → Server | Subscribe to salon updates |
| `appointment:new` | Server → Client | New booking received |
| `appointment:status` | Server → Client | Status changed |
| `appointment:cancelled` | Server → Client | Appointment cancelled |
| `appointment:rescheduled` | Server → Client | Appointment rescheduled |

---

Built with ❤️ by the GlowBook team.
