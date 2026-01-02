# Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── cashflow/      # Cashflow CRUD
│   │   ├── investments/   # Investment snapshots
│   │   ├── analytics/     # Analytics endpoints
│   │   └── notifications/ # Notification triggers
│   ├── (auth)/            # Auth pages (login, register)
│   ├── dashboard/         # Main dashboard
│   ├── cashflow/          # Cashflow management
│   ├── investments/       # Investment management
│   └── settings/          # User settings
│
├── services/              # Business logic layer
│   ├── auth.service.ts
│   ├── cashflow.service.ts
│   ├── investment.service.ts
│   ├── analytics.service.ts
│   └── notification.service.ts
│
├── lib/                   # Utilities
│   ├── api-response.ts    # Standard API response helper
│   ├── validation.ts      # Input validation functions
│   ├── encryption.ts      # AES-256-GCM encrypt/decrypt
│   └── prisma.ts          # Prisma client singleton
│
└── __tests__/             # Integration tests
    └── integration/

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed data script
```

## Architecture Pattern

Layered architecture with clear separation:
1. **Presentation** - React components and pages
2. **API Routes** - Request handling and middleware
3. **Services** - Business logic
4. **Data Access** - Prisma ORM

## API Response Format

All endpoints return:
```typescript
{
  responseCode: number,
  responseStatus: 'SUCCESS' | 'ERROR',
  responseMessage: string,
  responseDetails: T | null
}
```

## Database Models

- `users` - User accounts (encrypted email)
- `monthly_cashflow` - Monthly income/expense records
- `investments` - Investment metadata (GOLD/MUTUAL_FUND)
- `investment_snapshots` - Monthly investment values
- `notification_logs` - Email notification history
