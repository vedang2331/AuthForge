# AuthForge Architecture Specification

## Overview
AuthForge is designed as a production-grade, centralized Authentication, Authorization, and API Gateway Platform built with **TypeScript**, **Node.js**, **Express**, **Prisma ORM**, **PostgreSQL**, and **Redis**.

It uses a **modular monolith** design pattern:
- **Centralized Identity & Access Management (IAM)**: Registration, credential verification, JWT issuance, session tracking, OAuth integration, password lifecycle.
- **Refresh Token Rotation & Reuse Detection**: Cryptographically secure 256-bit refresh tokens with rotation and breach detection to prevent session hijacking.
- **Granular RBAC**: Role-Permission mapping with custom authorization middleware checking fine-grained permissions (`USER_READ`, `USER_DELETE`, `API_MANAGE`, etc.).
- **API Key Management**: Securely hashed API keys with scoped permissions, sliding window usage tracking, and rate limiting.
- **API Gateway Layer**: Dynamically proxies, authenticates, authorizes, rate-limits, and logs requests destined for upstream client microservices/applications.
- **Observability & Audit Engine**: Structured JSON logging (`winston`) with correlation IDs (`req_id`), plus persistent append-only audit logging for security events.

---

## Component Architecture

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
└───────────┬────────────┘            └───────────────────────┘
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

## Data Flow Sequences

### 1. Request Authentication Flow
1. Client sends request with `Authorization: Bearer <accessToken>` or `x-api-key: <rawKey>`.
2. `requestIdMiddleware` generates correlation ID `x-request-id`.
3. `authMiddleware` validates JWT signature and expiry, or verifies API Key hash against PostgreSQL.
4. User identity, active role, and permission array are attached to `req.user`.

### 2. Upstream Gateway Proxying
1. Client calls `/gateway/projects/123`.
2. `gatewayMiddleware` matches `/gateway/projects` to registered target `http://project-service/api`.
3. Validates client JWT / API Key and verifies required permissions (`PROJECT_READ`).
4. Evaluates route-specific Redis rate limit.
5. Injects context headers (`x-user-id`, `x-user-email`, `x-user-role`) and proxies HTTP request downstream.
