# Tech Stack

## Framework & Language
- Next.js (App Router)
- TypeScript (strict mode)

## Database
- MySQL
- Prisma ORM

## Authentication
- NextAuth.js with Credentials Provider
- JWT session strategy
- bcrypt for password hashing

## Email
- Nodemailer (SMTP)

## Testing
- Jest with TypeScript
- fast-check for property-based testing
- Minimum 100 iterations per property test

## Security
- AES-256-GCM encryption for sensitive data
- Environment variables for secrets (DATABASE_URL, ENCRYPTION_KEY, SMTP config)

## Common Commands

```bash
# Install dependencies
npm install

# Database
npx prisma migrate dev    # Run migrations
npx prisma db seed        # Seed database
npx prisma studio         # Database GUI

# Development
npm run dev

# Testing
npm test                  # Run all tests
npm test -- --watch       # Watch mode

# Build
npm run build
```

## Environment Variables Required

- `DATABASE_URL` - MySQL connection string
- `ENCRYPTION_KEY` - AES-256 encryption key
- `NEXTAUTH_SECRET` - NextAuth session secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
