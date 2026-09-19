# Shipment Status Tracker

A full-stack web application for creating, tracking, and managing shipment statuses with a complete audit trail of every status change.

---

## Live Demo

- **Frontend:** https://shipment-tracker-swart-ten.vercel.app/
- **Backend API:** https://shipment-tracker-api-40ho.onrender.com/
- **GitHub:** https://github.com/Tejass003/shipment-tracker

## Overview

The Shipment Status Tracker allows operations teams to:

- Create shipments with origin, destination, reference number, and expected delivery date
- Track shipments through a defined lifecycle (BOOKED → IN_TRANSIT → DELIVERED, etc.)
- View the complete status-change history for any shipment
- Search and filter shipments by reference number or status
- Update statuses with optional notes, with the system enforcing valid transitions

---

## Features

- **Shipment creation** with client-side and server-side validation
- **Status lifecycle** with enforced transition rules (no invalid jumps, no updates after terminal state)
- **Full audit trail** — every status change is recorded with timestamp and optional note
- **Search** across reference number, origin, and destination
- **Filter** by any status
- **Pagination** on the shipment list
- **Persistence** via PostgreSQL — data survives restarts
- **API-first** backend with clean JSON responses and standard HTTP status codes
- **Separate deployments** — frontend on Vercel, backend on Render

---

## Architecture

```
┌──────────────────────┐        ┌────────────────────────┐
│   React Frontend     │──────▶│   Express Backend      │
│   (Vite + TypeScript)│  HTTP │   (Node.js + TypeScript)│
│   Deployed: Vercel   │◀──────│   Deployed: Render      │
└──────────────────────┘        └────────────┬───────────┘
                                              │ Prisma ORM
                                             ▼
                                  ┌─────────────────────┐
                                  │    PostgreSQL        │
                                  │    (Neon in prod,    │
                                  │     Docker locally)  │
                                  └─────────────────────┘
```

Frontend and backend are completely independent deployments. They communicate via HTTP. The frontend reads `VITE_API_URL` to know where to send requests.

---

## Tech Stack

| Layer      | Technology          | Reason                                                          |
|------------|---------------------|-----------------------------------------------------------------|
| Frontend   | React 18 + Vite     | Fast dev server, standard React ecosystem                       |
| Language   | TypeScript          | Type safety across the entire stack                             |
| Routing    | React Router v6     | Standard SPA routing                                            |
| Styling    | Plain CSS           | Lightweight, no build overhead, no framework lock-in            |
| Backend    | Node.js + Express   | Familiar, minimal, well-supported                               |
| Validation | Zod                 | Schema-first validation with TypeScript inference               |
| ORM        | Prisma              | Type-safe DB client, migration tooling, readable schema         |
| Database   | PostgreSQL          | Relational integrity, ACID transactions, mature ecosystem       |
| Local DB   | Docker Compose      | Zero-install local Postgres without polluting the host system   |
| Deploy FE  | Vercel              | Native Vite/React support, automatic HTTPS, simple config       |
| Deploy BE  | Render              | Docker-free Node.js hosting with env var management             |
| Deploy DB  | Neon                | Serverless Postgres, free tier, direct Prisma compatibility     |

---

## Database Schema

```
Shipment
  id                   String   (cuid, PK)
  referenceNumber      String   (unique, indexed)
  origin               String
  destination          String
  currentStatus        ShipmentStatus (enum, indexed)
  expectedDeliveryDate DateTime
  createdAt            DateTime (auto)
  updatedAt            DateTime (auto)

ShipmentStatusHistory
  id          String         (cuid, PK)
  shipmentId  String         (FK → Shipment.id, cascade delete, indexed)
  status      ShipmentStatus (enum)
  note        String?        (optional)
  changedAt   DateTime       (auto)
```

A `Shipment` has many `ShipmentStatusHistory` records. When a shipment is created, its initial status is also written to the history table. When a status update occurs, both tables are written inside a database transaction to guarantee consistency.

---

## API Documentation

Base URL (local): `http://localhost:3001`
Base URL (prod): `https://shipment-tracker-api-40ho.onrender.com/`

### Health

| Method | Path      | Description        |
|--------|-----------|--------------------|
| GET    | `/health` | Service health check |

**Response:** `200 { "status": "ok", "timestamp": "..." }`

---

### Shipments

#### `POST /api/shipments`
Create a new shipment.

**Request body:**
```json
{
  "referenceNumber": "SHIP-2024-001",
  "origin": "Mumbai, India",
  "destination": "New York, USA",
  "currentStatus": "BOOKED",
  "expectedDeliveryDate": "2024-12-31",
  "note": "Priority shipment"
}
```

**Responses:**
- `201` — Created shipment with status history
- `400` — Validation error
- `409` — Duplicate reference number

---

#### `GET /api/shipments`
List shipments with optional filters.

**Query params:**
- `?q=` — Full-text search (reference, origin, destination)
- `?status=BOOKED|IN_TRANSIT|...` — Filter by status
- `?page=1` — Page number (default 1)
- `?limit=20` — Items per page (default 20, max 100)

**Response:** `200 { "data": [...], "pagination": { page, limit, total, totalPages } }`

---

#### `GET /api/shipments/:id`
Get a single shipment including full status history.

**Responses:**
- `200` — Shipment with `statusHistory` array
- `404` — Not found

---

#### `PATCH /api/shipments/:id/status`
Update the current status (creates a history record in the same transaction).

**Request body:**
```json
{
  "status": "IN_TRANSIT",
  "note": "Departed origin warehouse"
}
```

**Responses:**
- `200` — Updated shipment with history
- `400` — Same status, validation error
- `404` — Not found
- `422` — Invalid status transition

---

#### `GET /api/shipments/:id/history`
Get the status history for a shipment in chronological order.

**Response:** `200 [{ id, shipmentId, status, note, changedAt }, ...]`

---

## Status Flow

```
                  ┌──────────────┐
        ┌────────▶│   IN_TRANSIT  │◀────────┐
        │         └──────┬───────┘         │
        │                │                 │
  ┌─────┴────┐     ┌─────▼──────┐   ┌──────┴──────┐
  │  BOOKED  │────▶│CUSTOMS_HOLD│   │OUT_FOR_DELIV│
  └──────────┘     └─────┬──────┘   └──────┬──────┘
        │                │                 │
        │          (back to IN_TRANSIT)    ▼
        │                              ┌───────────┐
        └─────────────────────────────▶│ DELIVERED │ (terminal)
                                       └───────────┘

  Any non-terminal status → CANCELLED (terminal)
```

**Rules:**
- `BOOKED` → `IN_TRANSIT`, `CANCELLED`
- `IN_TRANSIT` → `CUSTOMS_HOLD`, `OUT_FOR_DELIVERY`, `CANCELLED`
- `CUSTOMS_HOLD` → `IN_TRANSIT`, `CANCELLED`
- `OUT_FOR_DELIVERY` → `DELIVERED`
- `DELIVERED` and `CANCELLED` are terminal — no further updates

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- Docker Desktop (for the local PostgreSQL option)

### 1. Clone and install

```bash
git clone https://github.com/Tejass003/shipment-tracker.git
cd shipment-tracker
```

### 2. Start the database (Local Postgres Option)

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` (credentials can be found in `docker-compose.yml`).

### 3. Set up the backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate     # generates Prisma client
npm run db:migrate:dev  # runs migrations against local DB
npm run dev             # starts on http://localhost:3001
```

### 4. Set up the frontend

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev             # starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                                    | Example                                                  |
|----------------|------------------------------------------------|----------------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string                   | `postgresql://user:pass@localhost:5432/shipment_tracker` |
| `PORT`         | Port the server listens on (default 3001)      | `3001`                                                   |
| `FRONTEND_URL` | Allowed CORS origin for the frontend           | `http://localhost:5173`                                  |

### Frontend (`frontend/.env`)

| Variable       | Description           | Example                   |
|----------------|-----------------------|---------------------------|
| `VITE_API_URL` | Backend API base URL  | `http://localhost:3001`   |

---

## Database Setup

### Local (Docker)

```bash
docker compose up -d        # start postgres
docker compose down         # stop (data persists in volume)
docker compose down -v      # stop AND delete data
```

### Reset and re-migrate

```bash
cd backend
npx prisma migrate reset --schema=../prisma/schema.prisma
```

### Neon (production)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project → copy the connection string
3. Set `DATABASE_URL` in your Render service environment variables

---

## Deployment

### Overview

| Service  | Platform | Notes                                      |
|----------|----------|--------------------------------------------|
| Database | Neon     | Serverless PostgreSQL                      |
| Backend  | Render   | Node.js web service                        |
| Frontend | Vercel   | Static SPA deployment                      |

### Step 1 — Database (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project
2. Copy the connection string (format: `postgresql://user:pass@host/db?sslmode=require`)
3. Keep this for the next step

### Step 2 — Backend (Render)

1. Sign up / log in at [render.com](https://render.com)
2. Click **New → Web Service** → connect your GitHub repository
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run db:generate && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables:
   - `DATABASE_URL` → your Neon connection string
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → `https://shipment-tracker-swart-ten.vercel.app/`
5. Deploy — Render will host your API at `https://shipment-tracker-api-40ho.onrender.com/`

### Step 3 — Frontend (Vercel)

1. Sign up / log in at [vercel.com](https://vercel.com)
2. Click **Add New Project** → import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` → `https://shipment-tracker-api-40ho.onrender.com/`
5. Deploy — Vercel will host your frontend at `https://shipment-tracker-swart-ten.vercel.app/`

### Step 4 — Update CORS

After both are deployed:
- Ensure your **Render** service → Environment has `FRONTEND_URL` set to `https://shipment-tracker-swart-ten.vercel.app/`
- Redeploy if you updated the variable after initial deployment.

---

## Assumptions

1. **No authentication** — The assignment explicitly excludes auth/roles/permissions. All shipments are visible and editable by any user.

2. **Reference number uniqueness** — Reference numbers are treated as globally unique identifiers. Attempts to create a duplicate return 409.

3. **Status as string enum** — Statuses are stored as a PostgreSQL enum for data integrity. Adding a new status would require a DB migration.

4. **One current status** — A shipment has exactly one current status at any time. History is append-only.

5. **CANCELLED is reachable from most states** — Any non-terminal status can be cancelled. This represents real-world scenarios (lost parcels, customer cancellations).

6. **Date handling** — `expectedDeliveryDate` is stored as a full timestamp (midnight UTC). The frontend displays it in the user's local timezone.

7. **Note field** — Notes are optional on status updates. On creation, if no note is provided, "Shipment created" is used as the initial history note.

8. **Soft deletes not implemented** — Deleting a shipment is not in scope. Cancellation serves as the terminal "inactive" state.

9. **No real-time updates** — The UI reflects the state at page load / last fetch. Refreshing gets the latest data.

---

## Scaling to 10,000 Shipments and Multiple Concurrent Users

The current implementation is deliberately simple. Here is what would change in a production system with 10,000+ shipments and multiple concurrent users:

### Database Indexes
The schema already includes indexes on `currentStatus` and `referenceNumber`. At higher scale, composite indexes (e.g. `(currentStatus, createdAt)`) would be added to support common query patterns efficiently. The `ShipmentStatusHistory` table benefits from the `shipmentId` index for fast history lookups.

### Pagination
Pagination is already implemented (`?page=&limit=`). At scale, cursor-based pagination (using `id` or `createdAt` as a cursor instead of `OFFSET`) would be preferred to avoid the performance degradation that `OFFSET N` causes on large tables.

### Connection Pooling
A single Prisma client manages a connection pool internally. For a high-concurrency backend, Neon's built-in connection pooler (PgBouncer-compatible) or an external tool like **PgBouncer** or **Prisma Accelerate** would be added between the application and the database. This prevents connection exhaustion under bursty traffic.

### Concurrency and Transactions
Status updates already use database transactions to prevent race conditions between the `currentStatus` update and the history insert. Under high concurrency, **optimistic locking** (checking that `currentStatus` hasn't changed since it was read) could be added to the status update path to prevent lost updates.

### Caching
A read-through cache (e.g. Redis) in front of frequently-read, infrequently-changing data — like a single shipment's details — would reduce database load. The cache key would be `shipment:{id}` and would be invalidated on any status update.

### Horizontal Backend Scaling
The Express backend is stateless (no in-memory session state), so multiple instances can run behind a load balancer (Render's scaling options, or Kubernetes) without coordination. Prisma's connection pool size should be tuned to `total_instances × pool_size ≤ max_db_connections`.

### Monitoring and Logging
Structured logging (e.g. with **pino**) would be added to record request durations, error rates, and slow queries. An APM tool (e.g. Datadog, Sentry) would track error rates and p95 latency. Database slow query logs would be enabled in Neon/PostgreSQL.

### Background Jobs
For very high throughput (e.g. bulk imports of thousands of shipments), status updates could be processed through a job queue (e.g. BullMQ + Redis) to avoid blocking HTTP responses and to retry on transient failures.

### Summary Table

| Concern                  | Current          | At Scale                                |
|--------------------------|------------------|-----------------------------------------|
| Pagination               | Offset-based     | Cursor-based                            |
| DB connections           | Prisma pool      | PgBouncer / Prisma Accelerate           |
| Concurrency control      | DB transaction   | + Optimistic locking                    |
| Read performance         | Direct DB        | Redis read cache                        |
| Backend scaling          | Single instance  | Horizontal (stateless, load-balanced)   |
| Observability            | console.log      | Structured logs + APM                   |
| Bulk operations          | Synchronous HTTP | Job queue (BullMQ)                      |
