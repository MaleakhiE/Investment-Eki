# Personal Finance & Investment Tracker API Documentation

This document provides comprehensive documentation for the Personal Finance & Investment Tracker API.

## Base URL

```
http://localhost:3000
```

## Authentication

The API uses JWT-based authentication via NextAuth.js. Most endpoints require authentication.

### Authentication Flow

1. **Register** a new user via `POST /api/auth/register`
2. **Get CSRF token** via `GET /api/auth/csrf`
3. **Login** via `POST /api/auth/callback/credentials` with email, password, and CSRF token
4. The session cookie (`next-auth.session-token`) is automatically set on successful login
5. Include the session cookie in subsequent requests (handled automatically by browsers)
6. **Check session** via `GET /api/auth/session` to verify authentication status
7. **Sign out** via `POST /api/auth/signout` with CSRF token

### Protected Endpoints

All endpoints except the authentication endpoints require a valid session. Unauthenticated requests will receive a `401 Unauthorized` response.

### Session Duration

Sessions are valid for 30 days by default. A successful password reset increments
the account's session version and immediately invalidates every previously issued
session on all devices. Users must sign in again with the new password.

## Response Format

All API responses follow a consistent format:

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Human-readable message",
  "responseDetails": { ... } | null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `responseCode` | number | HTTP status code |
| `responseStatus` | string | `"SUCCESS"` or `"ERROR"` |
| `responseMessage` | string | Human-readable description |
| `responseDetails` | object/array/null | Response data or error details |

## Error Responses

### Validation Error (400)

```json
{
  "responseCode": 400,
  "responseStatus": "ERROR",
  "responseMessage": "Validation failed",
  "responseDetails": {
    "errors": ["error message 1", "error message 2"]
  }
}
```

### Unauthorized (401)

```json
{
  "responseCode": 401,
  "responseStatus": "ERROR",
  "responseMessage": "Unauthorized",
  "responseDetails": null
}
```

### Not Found (404)

```json
{
  "responseCode": 404,
  "responseStatus": "ERROR",
  "responseMessage": "Resource not found",
  "responseDetails": null
}
```

### Conflict (409)

```json
{
  "responseCode": 409,
  "responseStatus": "ERROR",
  "responseMessage": "Email already registered",
  "responseDetails": null
}
```

### Server Error (500)

```json
{
  "responseCode": 500,
  "responseStatus": "ERROR",
  "responseMessage": "Internal server error",
  "responseDetails": null
}
```

---

## Endpoints

### Data export

`GET /api/export` returns a versioned JSON data export. It includes account
source records, transfer-aware transactions, investment snapshots, budgets,
and goals. The plaintext file contains decrypted financial data, must be
stored securely, and is intended for portability and analysis; it is not a
restorable database backup. Notable exclusions include receipt images,
credentials, recurring rules, notification settings, monthly cashflows, and
notification history.

`GET /api/export?format=csv` returns transactions as CSV. The following
optional filters apply only to CSV:

| Query parameter | Format | Meaning |
|-----------------|--------|---------|
| `from` | `YYYY-MM-DD` | Inclusive transaction start date |
| `to` | `YYYY-MM-DD` | Inclusive transaction end date |
| `accountId` | Positive integer | Owned active or archived source/destination account |

An account-filtered CSV includes `Account Delta`: income and incoming
transfers are positive; expenses and outgoing transfers are negative.
The CSV schema has eight positional columns: `Date`, `Type`, `Category`,
`Description`, `Amount`, `Source Account`, `Destination Account`, and
`Account Delta`.
Foreign and missing account IDs both return `404`. Invalid filters return the
standard `400` validation envelope. All export responses are private and
non-cacheable.

`GET /api/export?summary=true` returns record counts and owned account filter
options for the settings page.

### Transactions and receipt scanning

`POST /api/transactions` and `PUT /api/transactions/{id}` accept the existing transaction fields plus:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | string or null | No | Preset or custom account/card tag, trimmed, maximum 100 characters |
| `receipt_image` | string or null | No | Receipt image data URL returned by the OCR endpoint |

`GET /api/transactions` returns `account`, `has_receipt`, and `receipt_image: null`; the image payload is intentionally excluded from lists to keep responses bounded. Create/update responses include the persisted receipt value. Monetary fields remain encrypted at rest.

#### Scan receipt

`POST /api/transactions/ocr-scan` accepts authenticated `multipart/form-data` with one `image` file. JPEG, PNG, and WebP inputs are supported up to the route's documented size limit. OCR returns editable guesses (`amount`, `date`, `merchant`, `categoryGuess`) and `receipt_image`; it never creates a transaction automatically.

#### Savings suggestions

`GET /api/analytics/savings-suggestions` compares this month's expense categories with the preceding three calendar months. A category is suggested only when all three historical months contain spending and the current amount is at least 10% above their average. Results are ordered by potential saving and include concrete Bahasa Indonesia guidance.

### Authentication

#### Request password reset

```http
POST /api/auth/forgot-password
Content-Type: application/json

{"email":"user@example.com"}
```

The endpoint always returns the same success response for syntactically valid requests, whether or not the account exists. When it exists, a single-use reset link valid for 30 minutes is sent through the application-wide SMTP configuration.

#### Reset password

```http
POST /api/auth/reset-password
Content-Type: application/json

{"token":"token-from-email","password":"new-password"}
```

The raw reset token is never stored. Only its SHA-256 hash is persisted, and successful use consumes it.
Successful reset also signs the account out on every device by revoking older JWT session versions.

### Scheduler endpoints

`POST /api/notifications/send-monthly` and `POST /api/jobs/process-recurring`
are deployment-only scheduler endpoints. Both fail closed unless `CRON_SECRET`
is configured and the request contains `Authorization: Bearer <CRON_SECRET>`.
Monthly notification and recurring occurrence keys make scheduler retries
idempotent.

### Health endpoints

- `GET /api/health/live` reports process liveness without checking dependencies.
- `GET /api/health/ready` returns `200` only when MySQL responds and the global
  SMTP row is configured; failures return a generic `503` without dependency details.

#### Global SMTP configuration

SMTP is application-managed; users cannot view or modify credentials. Configure the deployment secret store with `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, and `MAIL_FROM_ADDRESS`, apply migrations, then run the server-side SMTP import command documented in `package.json`.

#### Register User

Creates a new user account.

```
POST /api/auth/register
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 8 characters |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Success Response (201):**

```json
{
  "responseCode": 201,
  "responseStatus": "SUCCESS",
  "responseMessage": "User registered successfully",
  "responseDetails": {
    "id": "1",
    "email": "user@example.com",
    "created_at": "2026-01-02T10:00:00.000Z"
  }
}
```

#### Get CSRF Token

Retrieves a CSRF token required for login and signout requests.

```
GET /api/auth/csrf
```

**Example Request:**

```bash
curl http://localhost:3000/api/auth/csrf
```

**Success Response (200):**

```json
{
  "csrfToken": "abc123def456..."
}
```

#### Login (Sign In)

Authenticates a user with email and password. On success, sets a session cookie.

```
POST /api/auth/callback/credentials
```

**Request Body (form-urlencoded or JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `password` | string | Yes | User password |
| `csrfToken` | string | Yes | CSRF token from `/api/auth/csrf` |

**Example Request:**

```bash
# Step 1: Get CSRF token
CSRF_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')

# Step 2: Login with credentials
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "email=user@example.com&password=securepassword123&csrfToken=$CSRF_TOKEN"
```

**Success Response:**
- Returns HTTP 200 with redirect
- Sets session cookie (`next-auth.session-token`)

**Error Response:**
- Returns HTTP 401 or redirects to login page with error

#### Get Current Session

Retrieves the current user's session information.

```
GET /api/auth/session
```

**Example Request:**

```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200) - Authenticated:**

```json
{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "ai_recommendation_enabled": true
  },
  "expires": "2026-02-01T10:00:00.000Z"
}
```

**Success Response (200) - Not Authenticated:**

```json
{}
```

#### Sign Out

Signs out the current user and invalidates the session.

```
POST /api/auth/signout
```

**Request Body (form-urlencoded):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `csrfToken` | string | Yes | CSRF token from `/api/auth/csrf` |

**Example Request:**

```bash
# Get CSRF token first
CSRF_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf -b cookies.txt | jq -r '.csrfToken')

# Sign out
curl -X POST http://localhost:3000/api/auth/signout \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -b cookies.txt \
  -d "csrfToken=$CSRF_TOKEN"
```

---

### Cashflow

#### Create/Update Cashflow

Creates a new cashflow record or updates an existing one for the specified month.

```
POST /api/cashflow
```

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `month` | string | Yes | Month in YYYY-MM format |
| `income` | number | Yes | Monthly income (≥ 0) |
| `expense_rent` | number | Yes | Rent expense (≥ 0) |
| `expense_living` | number | Yes | Living expense (≥ 0) |
| `expense_other` | number | Yes | Other expenses (≥ 0) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/cashflow \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "month": "2026-01",
    "income": 10000000,
    "expense_rent": 2000000,
    "expense_living": 3000000,
    "expense_other": 1000000
  }'
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Cashflow saved successfully",
  "responseDetails": {
    "id": "1",
    "user_id": "1",
    "month": "2026-01",
    "income": 10000000,
    "expense_rent": 2000000,
    "expense_living": 3000000,
    "expense_other": 1000000,
    "total_expense": 6000000,
    "net_cashflow": 4000000,
    "created_at": "2026-01-02T10:00:00.000Z"
  }
}
```

#### Get Cashflow History

Retrieves all monthly cashflow records for the authenticated user.

```
GET /api/cashflow
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/cashflow \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Cashflow history retrieved successfully",
  "responseDetails": [
    {
      "id": "1",
      "user_id": "1",
      "month": "2025-12",
      "income": 9500000,
      "expense_rent": 2000000,
      "expense_living": 2800000,
      "expense_other": 1200000,
      "total_expense": 6000000,
      "net_cashflow": 3500000,
      "created_at": "2025-12-01T10:00:00.000Z"
    },
    {
      "id": "2",
      "user_id": "1",
      "month": "2026-01",
      "income": 10000000,
      "expense_rent": 2000000,
      "expense_living": 3000000,
      "expense_other": 1000000,
      "total_expense": 6000000,
      "net_cashflow": 4000000,
      "created_at": "2026-01-02T10:00:00.000Z"
    }
  ]
}
```

#### Get Cashflow by Month

Retrieves the cashflow record for a specific month.

```
GET /api/cashflow/{month}
```

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | string | Month in YYYY-MM format |

**Example Request:**

```bash
curl http://localhost:3000/api/cashflow/2026-01 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Cashflow retrieved successfully",
  "responseDetails": {
    "id": "2",
    "user_id": "1",
    "month": "2026-01",
    "income": 10000000,
    "expense_rent": 2000000,
    "expense_living": 3000000,
    "expense_other": 1000000,
    "total_expense": 6000000,
    "net_cashflow": 4000000,
    "created_at": "2026-01-02T10:00:00.000Z"
  }
}
```

---

### Investments

#### List Investments

Retrieves all investment records for the authenticated user.

```
GET /api/investments
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/investments \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Investments retrieved successfully",
  "responseDetails": [
    {
      "id": "1",
      "user_id": "1",
      "type": "GOLD",
      "created_at": "2025-11-01T10:00:00.000Z"
    },
    {
      "id": "2",
      "user_id": "1",
      "type": "MUTUAL_FUND",
      "created_at": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

#### Create/Update Investment Snapshot

Creates a new investment snapshot or updates an existing one for the specified investment type and month.

```
POST /api/investments/snapshot
```

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"GOLD"` or `"MUTUAL_FUND"` |
| `month` | string | Yes | Month in YYYY-MM format |
| `invested_amount` | number | Yes | Total amount invested (≥ 0) |
| `current_value` | number | Yes | Current market value (≥ 0) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/investments/snapshot \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "GOLD",
    "month": "2026-01",
    "invested_amount": 5000000,
    "current_value": 5500000
  }'
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Investment snapshot saved successfully",
  "responseDetails": {
    "id": "1",
    "investment_id": "1",
    "month": "2026-01",
    "invested_amount": 5000000,
    "current_value": 5500000,
    "gain_loss": 500000,
    "created_at": "2026-01-02T10:00:00.000Z"
  }
}
```

#### Get Investment History by Type

Retrieves all snapshots for a specific investment type.

```
GET /api/investments/{type}/history
```

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `"GOLD"` or `"MUTUAL_FUND"` |

**Example Request:**

```bash
curl http://localhost:3000/api/investments/GOLD/history \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "GOLD investment history retrieved successfully",
  "responseDetails": [
    {
      "id": "1",
      "investment_id": "1",
      "month": "2025-12",
      "invested_amount": 4000000,
      "current_value": 4200000,
      "gain_loss": 200000,
      "created_at": "2025-12-01T10:00:00.000Z"
    },
    {
      "id": "2",
      "investment_id": "1",
      "month": "2026-01",
      "invested_amount": 5000000,
      "current_value": 5500000,
      "gain_loss": 500000,
      "created_at": "2026-01-02T10:00:00.000Z"
    }
  ]
}
```

---

### Analytics

#### Get Cashflow Trend

Retrieves monthly net cashflow trend data.

```
GET /api/analytics/cashflow-trend
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/analytics/cashflow-trend \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Cashflow trend retrieved successfully",
  "responseDetails": [
    { "month": "2025-11", "net_cashflow": 4000000 },
    { "month": "2025-12", "net_cashflow": 3500000 },
    { "month": "2026-01", "net_cashflow": 4500000 }
  ]
}
```


#### Get Portfolio Analytics

Retrieves portfolio summary and growth over time.

```
GET /api/analytics/portfolio
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/analytics/portfolio \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Portfolio analytics retrieved successfully",
  "responseDetails": {
    "summary": {
      "total_invested": 10000000,
      "total_current_value": 11500000,
      "total_gain_loss": 1500000
    },
    "growth": [
      {
        "month": "2025-12",
        "invested_amount": 8000000,
        "current_value": 8500000
      },
      {
        "month": "2026-01",
        "invested_amount": 10000000,
        "current_value": 11500000
      }
    ]
  }
}
```

#### Get Investment Comparison

Retrieves separate summaries for Gold and Mutual Fund investments.

```
GET /api/analytics/comparison
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/analytics/comparison \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Investment comparison retrieved successfully",
  "responseDetails": {
    "gold": {
      "total_invested": 5000000,
      "total_current_value": 5500000,
      "total_gain_loss": 500000
    },
    "mutual_fund": {
      "total_invested": 5000000,
      "total_current_value": 6000000,
      "total_gain_loss": 1000000
    }
  }
}
```

#### Get AI Investment Recommendation

Retrieves AI-powered investment allocation recommendation based on user's financial history.

```
GET /api/analytics/recommendation
```

**Authentication:** Required

**Note:** Returns `403 Forbidden` if AI recommendation is disabled in user settings.

**Example Request:**

```bash
curl http://localhost:3000/api/analytics/recommendation \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Investment recommendation generated successfully",
  "responseDetails": {
    "gold_percentage": 40,
    "mutual_fund_percentage": 60,
    "investable_amount": 4000000,
    "reasoning": "Berdasarkan analisis keuangan Anda, kami merekomendasikan alokasi 40% untuk Emas dan 60% untuk Reksa Dana. Cashflow Anda stabil dengan rata-rata surplus Rp 4.000.000 per bulan.",
    "risk_profile": "moderate",
    "should_invest": true,
    "warnings": []
  }
}
```

**AI Disabled Response (403):**

```json
{
  "responseCode": 403,
  "responseStatus": "ERROR",
  "responseMessage": "AI recommendation is disabled. Enable it in settings to receive investment recommendations.",
  "responseDetails": null
}
```

---

### Settings

#### Get User Settings

Retrieves the current user's settings.

```
GET /api/settings
```

**Authentication:** Required

**Example Request:**

```bash
curl http://localhost:3000/api/settings \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Settings retrieved successfully",
  "responseDetails": {
    "ai_recommendation_enabled": true
  }
}
```

#### Toggle AI Recommendation Setting

Enables or disables AI investment recommendations.

```
PATCH /api/settings/ai-recommendation
```

**Authentication:** Required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Enable or disable AI recommendations |

**Example Request:**

```bash
curl -X PATCH http://localhost:3000/api/settings/ai-recommendation \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "enabled": false
  }'
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "AI recommendation setting updated successfully",
  "responseDetails": {
    "ai_recommendation_enabled": false
  }
}
```

---

### Notifications

#### Trigger Monthly Notifications

Triggers monthly email notifications for all users. This endpoint is designed to be called by a cron job scheduler.

```
POST /api/notifications/send-monthly
```

**Authentication:** Required `Authorization: Bearer <CRON_SECRET>`.

The endpoint fails closed when `CRON_SECRET` is missing or blank. Configure a
high-entropy value in the deployment secret store and use the same value in
the scheduler. Success, authorization-error, and server-error responses use
`Cache-Control: private, no-store, max-age=0`.

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/notifications/send-monthly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Success Response (200):**

```json
{
  "responseCode": 200,
  "responseStatus": "SUCCESS",
  "responseMessage": "Monthly notifications processed: 5 sent, 1 failed, 2 skipped",
  "responseDetails": {
    "sent": 5,
    "failed": 1,
    "skipped": 2,
    "total": 8
  }
}
```

The response is aggregate-only and intentionally contains no per-user
identifiers or delivery metadata. `skipped` currently means the
month/type delivery was already claimed or processed for idempotency; it does
not mean a stored notification preference was enforced. Per-user
reconciliation remains in server-side notification logs.

---

## Data Types

### Investment Types

| Value | Description |
|-------|-------------|
| `GOLD` | Gold (Emas Digital) investment |
| `MUTUAL_FUND` | Mutual Fund (Reksa Dana) investment |

### Notification Types

| Value | Description |
|-------|-------------|
| `REMINDER` | Reminder to enter monthly data |
| `SUMMARY` | Monthly financial summary |

### Risk Profiles

| Value | Description |
|-------|-------------|
| `conservative` | Low risk tolerance, prefers stable assets |
| `moderate` | Balanced risk tolerance |
| `aggressive` | High risk tolerance, prefers growth assets |

---

## Validation Rules

### Month Format
- Must be in `YYYY-MM` format
- Year must be 4 digits
- Month must be 01-12

### Monetary Values
- Must be non-negative numbers
- Supports decimal values

### Email
- Must be a valid email format

### Password
- Minimum 8 characters

---

## OpenAPI Specification

For a machine-readable API specification, see the [OpenAPI 3.0 specification](../openapi.json) in the project root.
