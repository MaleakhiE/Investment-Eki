# Product Overview

Personal Finance & Investment Tracker - a single-user web application for tracking monthly income/expenses and managing investments (Gold and Mutual Funds).

## Core Features

- User authentication with JWT sessions
- Monthly cashflow tracking (income, rent, living, other expenses)
- Investment portfolio management (Gold/Mutual Fund snapshots)
- Analytics dashboard with trends and portfolio insights
- Automated monthly email notifications (reminders and summaries)

## Key Constraints

- Single-user architecture (extensible to multi-user)
- Investment types limited to GOLD and MUTUAL_FUND
- All sensitive data encrypted at rest (AES-256-GCM)
- Standardized API response format across all endpoints
