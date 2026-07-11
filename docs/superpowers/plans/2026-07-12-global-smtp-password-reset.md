# Global SMTP and Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan with TDD and review gates.

**Goal:** Replace per-user SMTP configuration with one encrypted database-backed application configuration and add secure email password reset.

**Architecture:** A singleton `ApplicationSmtpSettings` row stores encrypted credentials and is updated only by a CLI importer reading environment variables. Password-reset requests create hashed, expiring, single-use tokens and email the raw token in a reset URL; raw tokens are never stored or logged.

**Tech Stack:** Next.js App Router, Prisma/MySQL, Node crypto, bcrypt, Nodemailer, Jest.

## Global Constraints

- Never embed or log SMTP credentials; `SMTP_PASS` is read from environment only.
- SMTP is global and users cannot view, create, update, delete, or test credentials.
- Port 465 uses implicit TLS; other ports use STARTTLS behavior.
- Forgot-password responses are identical whether or not an account exists.
- Tokens use at least 32 random bytes, SHA-256 at rest, 30-minute expiry, one-time consumption, and invalidate prior unused tokens.
- Password validation remains identical to registration.
- API responses retain the standard response envelope.

### Task 1: Global SMTP configuration

- [ ] Add failing service tests for encrypted singleton reads/writes and environment validation.
- [ ] Add Prisma singleton model and migration; keep legacy per-user table only for backward-compatible database safety.
- [ ] Refactor SMTP/notification delivery to global settings.
- [ ] Add CLI importer and npm scripts; remove user SMTP mutation/test routes and UI.

### Task 2: Password-reset backend

- [ ] Add failing tests for generic request responses, token hashing/expiry/single use, password validation, and mail delivery.
- [ ] Add reset-token model and migration.
- [ ] Implement forgot/reset services and public API routes with bounded in-process throttling.
- [ ] Ensure tokens and account existence never enter logs or responses.

### Task 3: Password-reset UI and integration

- [ ] Add forgot-password and reset-password public pages.
- [ ] Add login-page entry link and middleware/auth-route allowances.
- [ ] Update documentation and OpenAPI.
- [ ] Run full tests, TypeScript, lint, Prisma validation/generation, production build, security review, and diff checks.
