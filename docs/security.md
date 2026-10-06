# Threat Model & Security Architecture

## 1. Threat Mitigation Matrix

| Threat Category | Potential Attack Vector | AuthForge Mitigation |
|---|---|---|
| **Credential Stuffing / Brute Force** | Automated dictionary attacks against `/login` | Strict Redis rate limiting (5 attempts/min/IP) + Account lockout after 5 consecutive failed attempts. |
| **Token Theft & Replay** | Stolen Refresh Token used to generate access tokens | Refresh Token Rotation with Token Family tracking. Immediate revocation of all family tokens on reuse detection. |
| **XSS & Token Sniffing** | JavaScript accessing local storage tokens | Refresh Tokens placed in `httpOnly`, `SameSite=Strict`, `Secure` cookies. Access tokens short-lived (15m). |
| **Privilege Escalation** | Manipulating token payload or user requests | Decoupled RBAC system with server-side permission verification (`requirePermission`). Roles loaded from DB/Redis session state. |
| **Secret Leakage** | API keys or raw passwords exposed in DB logs or Git | Passwords hashed using bcrypt (salt round 12). API keys hashed via HMAC-SHA256 before storage. Never log credentials or tokens. |
| **Injection Attacks** | SQL/NoSQL Injection in user input | Prisma ORM uses parameterized queries exclusively. Input sanitized and validated using Zod schemas. |
| **API Abuse & DoS** | Flooding backend or upstream services | Distributed Redis sliding window rate limiters across IP, User ID, and API Key levels. |

---

## 2. API Key Security Model

1. API Keys use the format `af_live_<identifier>.<secret>`.
2. The key identifier (`af_live_x9k2m`) is unhashed and used for index lookup.
3. The key secret is hashed using SHA-256 before saving to PostgreSQL (`keySecretHash`).
4. **Secret Exposure Policy**: The raw key secret is returned **EXACTLY ONCE** in the JSON response payload upon creation. It is never stored in plaintext and cannot be retrieved later.
