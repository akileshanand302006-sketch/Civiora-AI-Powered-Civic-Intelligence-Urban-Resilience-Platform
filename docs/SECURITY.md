# CivicPulse — Security & Hardening Manual

> **Classification**: Production DevSecOps Standard  
> **Target Framework**: NIST Cybersecurity Framework / OWASP Top 10

---

## 1. Authentication & Cryptography

### Argon2id Password Hashing
All credentials are processed using the state-of-the-art **Argon2id** hashing algorithm, configured with memory-hard parameters resisting GPU/ASIC brute-force dictionary attacks:
- **Memory Cost**: 65,536 KiB (64 MiB)
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads
- Passwords are never logged or returned in any API response (`select: false` on Mongoose schema).

### Token Architecture & Refresh Rotation
1. **Access Tokens**: Short-lived JWTs (15 minutes expiry) signed using HMAC-SHA256 (`JWT_ACCESS_SECRET`). Contains minimal claims: `sub` (userId), `org` (orgId), `role`, and `sessionId`.
2. **Refresh Tokens**: Cryptographically secure 48-byte opaque random tokens (`crypto.randomBytes(48).toString('base64url')`). Stored in database exclusively as SHA-256 hashes.
3. **Token Family Rotation**: Whenever a refresh token is exchanged, the previous token is invalidated and a replacement token is issued. If a duplicate or reused refresh token is presented, the entire token family is revoked immediately to neutralize potential token theft.
4. **Session Revocation**: Redis key blacklist (`revoked:session:<sessionId>`) provides instant, cluster-wide session termination.

---

## 2. Granular RBAC & ABAC Matrix

CivicPulse implements 9 hierarchical roles with over 30 distinct permissions:

| Role | Hierarchy | Primary Responsibilities |
|---|---|---|
| `citizen` | Level 1 | Self-registration, incident reporting, tracking, community verification |
| `field_worker` | Level 2 | Mobile work order execution, task status progression, photo proof |
| `officer` | Level 3 | Department incident triage, task delegation, evidence review |
| `manager` | Level 4 | Cross-department operations, SLA monitoring, escalation overrides |
| `emergency_operator`| Level 4 | Emergency SOS alerts, disaster management dispatch |
| `moderator` | Level 3 | Spam removal, false report flagging, citizen trust scoring |
| `tenant_admin` | Level 5 | Organization branding, SLA policy configuration, user provisioning |
| `system_admin` | Level 6 | Multi-tenant cluster management, platform configuration |
| `security_auditor` | Level 5 | Immutable audit trail inspection, fraud analysis, session surveillance |

---

## 3. Defense-in-Depth & Boundary Hardening

1. **Helmet HTTP Headers**: Enforces `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
2. **Rate Limiting**:
   - Standard API endpoints: 100 requests per 15-minute window per IP.
   - Authentication routes (`/auth/login`, `/auth/register`): Strict 10 requests per 15-minute window preventing credential stuffing.
3. **Input Validation**: Zero unvalidated input. All incoming payloads pass through strict Zod schemas on both client and server before reaching application controllers.
4. **Location Fuzzing**: Citizen reports on public map views undergo random 100-200m Gaussian coordinate fuzzing, safeguarding reporter privacy while preserving analytical accuracy.
