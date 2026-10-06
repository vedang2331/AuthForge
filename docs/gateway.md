# API Gateway Architecture

## Overview
AuthForge includes a modular, reverse-proxy API Gateway layer mounted at `/gateway/:service/*`.

It sits in front of internal or third-party microservices to centralize:
- Authentication verification (JWT or API Key)
- Role & Permission enforcement (`requiredPermissions`)
- Rate limiting per client / route
- Request context header injection
- Structured logging & telemetry

```
Client App
   │
   ▼  GET /gateway/projects/123
┌─────────────────────────────────────────────────────────────┐
│                      AuthForge Gateway                      │
│                                                             │
│ 1. Match Route: /gateway/projects -> http://project-svc/api │
│ 2. Authenticate: Validate Bearer JWT or x-api-key           │
│ 3. Authorize: Check user perms include PROJECT_READ        │
│ 4. Rate Limit: Check 100 req / min limit                    │
│ 5. Inject Context Headers:                                  │
│    - x-user-id: usr_9921                                    │
│    - x-user-email: dev@authforge.io                         │
│    - x-user-role: Developer                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ Forwarded HTTP Request
┌─────────────────────────────────────────────────────────────┐
│                   Upstream Project Microservice             │
└─────────────────────────────────────────────────────────────┘
```
