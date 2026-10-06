# AuthForge 🛡️
### Production-Quality Centralized Authentication, Authorization & API Gateway Platform

[![Build & Test CI](https://github.com/authforge/authforge/actions/workflows/ci.yml/badge.svg)](https://github.com/authforge/authforge/actions)
![Node.js](https://img.shields.io/badge/Node.js-v22.x-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.8-blue.svg)
![Express](https://img.shields.io/badge/Express-v4.21-lightgrey.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue.svg)
![Redis](https://img.shields.io/badge/Redis-v7-red.svg)
![Prisma](https://img.shields.io/badge/Prisma-v6.4-teal.svg)

---

## 1. Problem Statement & Executive Summary

In modern cloud application ecosystems, implementing authentication and access control directly inside every standalone microservice creates code duplication, security vulnerabilities, fragmented session state, and operational overhead.

**AuthForge** solves this by providing a unified, centralized **Identity and Access Management (IAM)** and **API Gateway Platform**. It handles identity lifecycles, OAuth integration, cryptographic token issuance, refresh token rotation with breach detection, fine-grained Role-Based Access Control (RBAC), hashed API keys, sliding-window rate limiting, and dynamic reverse-proxy routing for downstream services.

---

## 2. Key Platform Features

- 🔐 **Dual-Token Authentication**: Short-lived JWT Access Tokens (15m) & Long-lived Refresh Tokens (7d).
- 🔄 **Refresh Token Rotation & Reuse Detection**: Cryptographically secure 256-bit token family tracking. Immediate revocation of all family tokens and active sessions upon detecting reuse attacks.
- 📱 **Multi-Device Session Management**: Track active client sessions (device type, IP, last active timestamp) with support for single-session revocation or revoking all active sessions.
- 🛡️ **Fine-Grained RBAC**: Decoupled authorization guards mapped to atomic permissions (`USER_READ`, `PROJECT_WRITE`, `API_MANAGE`, `GATEWAY_MANAGE`).
- 🔑 **Hashed API Key System**: HMAC-SHA256 hashed API keys with custom permission scopes and sliding-window rate limits. Secret keys are displayed **EXACTLY ONCE** upon creation.
- ⚡ **Redis Sliding-Window Rate Limiting**: Distributed rate limiters across IPs, user IDs, and API keys with standard HTTP 429 and `Retry-After` headers.
- 🌐 **Dynamic API Gateway**: Reverse proxy layer (`/gateway/:service/*`) that authenticates, authorizes, rate-limits, and forwards requests to registered upstream services with context header injection (`x-user-id`, `x-user-email`).
- 📜 **Security Audit Trail**: Persistent, append-only security event logger recording `LOGIN_SUCCESS`, `LOGIN_FAILED`, `TOKEN_REUSE_DETECTED`, `API_KEY_CREATED`, `ROLE_CHANGED`, etc.
- 📊 **Admin Dashboard**: React + Vite + Tailwind CSS dashboard for managing users, sessions, API keys, audit trails, and testing gateway routes.
- 📖 **Interactive Swagger Docs**: OpenAPI 3.0 documentation served at `/api-docs`.

---

## 3. Technology Stack

| Domain | Technology |
|---|---|
| **Backend Framework** | Node.js (v22), TypeScript, Express.js |
| **Database & ORM** | PostgreSQL 16, Prisma ORM |
| **Caching & Rate Limiting** | Redis 7, `ioredis` (with in-memory fallback) |
| **Authentication & Security** | JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, Cookie-Parser |
| **Validation** | Zod |
| **Testing** | Jest, `ts-jest`, Supertest |
| **Documentation** | Swagger UI (`swagger-ui-express`, `swagger-jsdoc`) |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions |
| **Admin Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons |

---

## 4. Architecture & Component Diagram

```
Client App (e.g. DevFlow) / Postman / Admin Dashboard
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Security Middleware                     │
│               (Helmet, CORS, Cookie Parser)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Redis Sliding Window Limiter                 │
│         (rate:login:{ip}, rate:api:{userId})                │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌────────────────────────┐            ┌───────────────────────┐
│     /api/v1 Routes     │            │    /gateway Routes    │
│  (Auth, User, Key, etc)│            │ (Dynamic Reverse Proxy│
└───────────┬────────────┘            └───────────┬───────────┘
            │                                     │
            ▼                                     ▼
┌────────────────────────┐            ┌───────────────────────┐
│  Auth & RBAC Guards    │            │ Forward to Target Svc │
│ (requirePermission)    │            │ (x-user-id, x-email)  │
└───────────┬────────────┘            └───────────┬───────────┘
            │
            ▼
┌────────────────────────┐
│   Services Layer       │
│ (AuthSvc, ApiKeySvc)   │
└───────────┬────────────┘
            │
      ┌─────┴──────────────┐
      ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │ Redis Cache  │
│ (Prisma ORM) │    │ & Session    │
└──────────────┘    └──────────────┘
```

---

## 5. Redis Key Design

| Key Pattern | Data Type | Purpose | TTL |
|---|---|---|---|
| `auth:session:{sessionId}` | String (JSON) | Cached active session details | 7 days |
| `rate:login:{ip}` | String (Counter) | IP Rate limiting for login attempts | 60 sec |
| `rate:api:{userId}` | String (Counter) | User rate limiting for API requests | 60 sec |
| `rate:key:{keyId}` | String (Counter) | Rate limiting per API Key | 60 sec |
| `rate:gateway:{id}:{ip}` | String (Counter) | Gateway rate limiting per route/IP | 60 sec |
| `auth:reset:{tokenHash}` | String | Password reset token -> userId mapping | 15 min |
| `auth:verify:{tokenHash}` | String | Email verification token -> userId mapping | 24 hours |

---

## 6. Quick Start & Setup Instructions

### Prerequisites
- Node.js v22+
- Docker & Docker Compose (or local PostgreSQL 16 & Redis 7)

### Local Development Setup

1. **Clone repository & install dependencies**:
   ```bash
   git clone https://github.com/authforge/authforge.git
   cd AuthForge
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start PostgreSQL & Redis with Docker Compose**:
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run Database Migrations & Seed Default Data**:
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - API Platform: `http://localhost:4000/api/v1`
   - Swagger OpenAPI Docs: `http://localhost:4000/api-docs`

6. **Start Admin Dashboard (Optional)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Admin Dashboard: `http://localhost:5173`

---

## 7. Docker Deployment

Run the complete platform stack (AuthForge Backend + Postgres + Redis) with a single command:

```bash
docker-compose up --build -d
```

---

## 8. Testing & CI/CD Pipeline

AuthForge includes comprehensive unit and integration test suites:

```bash
# Run unit & integration tests
npm test

# Run TypeScript type check & linter
npm run lint
```

### GitHub Actions CI Workflow (`.github/workflows/ci.yml`)
1. Checks out repository and installs Node.js dependencies.
2. Runs TypeScript type-checking (`npm run lint`).
3. Spins up Postgres & Redis service containers.
4. Executes Prisma schema push and seeds database.
5. Runs test suite with Jest & Supertest.
6. Builds production Docker container image.

---

## 9. Software Engineer Interview Q&A (Based on AuthForge)

### Q1: How does AuthForge detect and mitigate Refresh Token theft?
**Answer**: AuthForge uses **Refresh Token Rotation with Token Family Tracking**. Every login generates a new `familyId`. When a refresh token is presented, the server validates its SHA-256 hash in PostgreSQL. If valid, the old token is marked `isUsed = true`, and a new refresh token under the same `familyId` is issued. If an attacker tries to reuse an old refresh token (`isUsed === true`), AuthForge flags a breach, revokes **ALL** tokens sharing that `familyId`, invalidates the active session, and logs a `TOKEN_REUSE_DETECTED` security event.

### Q2: Why use Redis for rate limiting instead of in-memory maps in Node.js?
**Answer**: In-memory maps inside Node.js are instance-local. When scaling AuthForge across multiple container instances behind a load balancer, instance-local memory leads to rate-limit circumvention. Using Redis ensures a single, distributed sliding-window counter shared across all cluster instances.

### Q3: How does the API Gateway propagate authenticated identity to downstream services?
**Answer**: Once the Gateway middleware authenticates the client token/key and verifies required permissions, it strips incoming authorization headers and injects trusted context headers (`x-user-id`, `x-user-email`, `x-user-role`) before proxying the request to upstream microservices. This allows microservices to remain stateless and decoupled from authentication logic.

---

## 10. Resume-Ready Project Description

```
AuthForge | Centralized IAM & API Gateway Platform (Node.js, TypeScript, PostgreSQL, Redis, Prisma)
• Architected a production-grade identity platform handling authentication, OAuth 2.0, dual-token JWT management, and dynamic reverse-proxy API routing for client microservices.
• Implemented Refresh Token Rotation with token family reuse detection, automatically revoking compromised session families upon security breach detection.
• Designed a fine-grained RBAC model with decoupled Express permission guards and HMAC-SHA256 hashed API keys with scoped permission limits.
• Engineered distributed Redis sliding-window rate limiters across IPs, User IDs, and API keys, returning standard HTTP 429 and Retry-After headers.
• Built structured JSON logging with correlation IDs (req_id), append-only security audit logging, OpenAPI/Swagger documentation, Docker containerization, and GitHub Actions CI/CD pipelines.
```

---

## 11. License
Distributed under the MIT License.
