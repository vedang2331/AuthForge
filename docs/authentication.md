# Authentication & Session Management

## 1. Dual-Token Architecture

AuthForge uses a dual-token strategy combining short-lived Access Tokens (JWT) and long-lived Refresh Tokens (Opaque Cryptographic Strings).

| Token Type | Lifespan | Format | Storage Location |
|---|---|---|---|
| **Access Token** | 15 Minutes | Signed JWT | Authorization Header (`Bearer <token>`) |
| **Refresh Token** | 7 Days | Random 256-bit Entropy String | `httpOnly`, `SameSite=Strict`, `Secure` Cookie |

---

## 2. Refresh Token Rotation & Breach Detection

To protect against stolen refresh tokens, AuthForge implements **Token Family Tracking**:

```
[Login] ──> Issues Token A (Family #101)
               │
               ▼
[Refresh #1] ──> Token A used. Mark A as USED.
                 Issues Token B (Family #101).
               │
               ▼
[Breach!] ───> Attacker attempts to re-use Token A!
               System detects: Token A is USED.
               SECURITY ALERT TRIGGERED!
               Revokes Family #101 (Tokens A & B).
               Invalidates active Session.
```

### Protocol Steps:
1. Every new login assigns a unique `familyId` (UUID) to the initial Refresh Token.
2. When refreshing, the client presents the token.
3. The server computes the SHA-256 hash of the incoming token and checks PostgreSQL.
4. **Breach Check**: If `isUsed === true` or `isRevoked === true`:
   - System flags a potential security compromise!
   - Immediately revokes **ALL** refresh tokens belonging to `familyId`.
   - Revokes the associated `Session` in Postgres and deletes the session cache in Redis.
   - Logs `TOKEN_REUSE_DETECTED` in the Security Audit Log.
   - Returns `401 Unauthorized` with error code `TOKEN_REUSED`.

---

## 3. Account Lockout & Throttling

To mitigate dictionary and brute-force credential stuffing attacks:
- Failed login attempts are incremented per user.
- If a user reaches **5 consecutive failed attempts**, their account is locked for **15 minutes** (`lockoutUntil`).
- Successful authentication resets the counter to 0.
