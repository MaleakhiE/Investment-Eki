# Implementation Plan: Personal Finance & Investment Tracker

## Overview

This implementation plan breaks down the Personal Finance Tracker into incremental coding tasks. Each task builds on previous work, with property tests validating correctness at each stage. The implementation uses Next.js (App Router), TypeScript, Prisma ORM with MySQL, NextAuth.js, and Nodemailer.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Next.js project with TypeScript and configure dependencies
    - Create Next.js app with App Router
    - Install dependencies: prisma, @prisma/client, next-auth, bcrypt, nodemailer, fast-check, jest
    - Configure TypeScript strict mode
    - Set up Jest with TypeScript support
    - _Requirements: 8.1_

  - [x] 1.2 Create Prisma schema and database configuration
    - Define User, MonthlyCashflow, Investment, InvestmentSnapshot, NotificationLog models
    - Use String type for encrypted fields (email, monetary values)
    - Configure MySQL connection via DATABASE_URL
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 1.3 Run database migration
    - Create initial Prisma migration
    - Run `prisma migrate dev` to create all tables
    - Verify tables created correctly in MySQL
    - _Requirements: 9.1_

  - [x] 1.4 Implement encryption utility
    - Create encrypt/decrypt functions using AES-256-GCM
    - Create encryptNumber/decryptNumber for monetary values
    - Use ENCRYPTION_KEY from environment variables
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 1.5 Write property test for encryption round-trip
    - **Property 23: Encryption Round-Trip**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x] 1.6 Implement API response helper utility
    - Create responseAPI function with typed interface
    - Ensure all four fields are always present
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 1.7 Write property test for API response structure
    - **Property 16: API Response Structure Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [x] 1.8 Create database seed script
    - Create seed script with default admin user (hashed password)
    - Add sample cashflow data (encrypted)
    - Add sample investment snapshots (encrypted)
    - Configure `prisma db seed` command
    - _Requirements: 9.2, 9.3, 9.4_

- [x] 2. Validation Utilities
  - [x] 2.1 Implement validation functions
    - Create validateMonth for YYYY-MM format
    - Create validateMonetaryValue for non-negative decimals
    - Create validateInvestmentType for GOLD/MUTUAL_FUND enum
    - Create validateEmail and validatePassword
    - Create validateCashflowInput and validateSnapshotInput
    - _Requirements: 2.6, 3.1, 3.6, 7.1, 7.2, 7.3_

  - [x] 2.2 Write property test for month format validation
    - **Property 20: Month Format Validation**
    - **Validates: Requirements 7.3**

  - [x] 2.3 Write property test for monetary value validation
    - **Property 9: Monetary Value Validation**
    - **Validates: Requirements 2.6, 3.6**

  - [x] 2.4 Write property test for investment type validation
    - **Property 10: Investment Type Validation**
    - **Validates: Requirements 3.1**

  - [x] 2.5 Write property test for invalid input rejection
    - **Property 21: Invalid Input Rejection**
    - **Validates: Requirements 7.1, 7.2**

- [x] 3. Checkpoint - Validation Layer Complete
  - Ensure all validation tests pass, ask the user if questions arise.

- [x] 4. Authentication Service
  - [x] 4.1 Implement password hashing and verification
    - Create hashPassword function using bcrypt
    - Create verifyPassword function
    - _Requirements: 1.1_

  - [x] 4.2 Write property test for password hashing round-trip
    - **Property 1: Password Hashing Round-Trip**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 4.3 Implement user registration service with email encryption
    - Create register function that hashes password and encrypts email
    - Check for duplicate email before creation (compare encrypted values)
    - _Requirements: 1.1, 1.2, 10.1_

  - [x] 4.4 Write property test for duplicate email rejection
    - **Property 2: Duplicate Email Rejection**
    - **Validates: Requirements 1.2**

  - [x] 4.5 Implement credential validation service
    - Create validateCredentials function
    - Return user if valid, null if invalid
    - _Requirements: 1.3, 1.4_

  - [x] 4.6 Write property test for invalid credentials rejection
    - **Property 3: Invalid Credentials Rejection**
    - **Validates: Requirements 1.4**

  - [x] 4.7 Configure NextAuth.js with Credentials Provider
    - Set up NextAuth configuration
    - Implement JWT session strategy
    - Create auth middleware for protected routes
    - _Requirements: 1.3, 1.5_

  - [x] 4.8 Write property test for unauthorized request rejection
    - **Property 22: Unauthorized Request Rejection**
    - **Validates: Requirements 7.5**

- [x] 5. Checkpoint - Authentication Complete
  - Ensure all authentication tests pass, ask the user if questions arise.

- [x] 6. Cashflow Service
  - [x] 6.1 Implement cashflow calculation functions
    - Create calculateTotalExpense function
    - Create calculateNetCashflow function
    - _Requirements: 2.1, 2.2_

  - [x] 6.2 Write property test for total expense calculation
    - **Property 4: Total Expense Calculation Invariant**
    - **Validates: Requirements 2.1**

  - [x] 6.3 Write property test for net cashflow calculation
    - **Property 5: Net Cashflow Calculation Invariant**
    - **Validates: Requirements 2.2**

  - [x] 6.4 Implement cashflow persistence (save/update) with encryption
    - Create saveCashflow function with upsert logic
    - Encrypt all monetary values before storing
    - Calculate and store total_expense and net_cashflow (encrypted)
    - _Requirements: 2.3, 2.5, 10.2_

  - [x] 6.5 Write property test for cashflow persistence round-trip
    - **Property 6: Cashflow Persistence Round-Trip**
    - **Validates: Requirements 2.3**

  - [x] 6.6 Write property test for cashflow upsert idempotence
    - **Property 8: Cashflow Upsert Idempotence**
    - **Validates: Requirements 2.5**

  - [x] 6.7 Implement cashflow history retrieval with decryption
    - Create getCashflowHistory function
    - Decrypt monetary values when retrieving
    - Return all records for user ordered by month
    - _Requirements: 2.4, 10.3, 10.5_

  - [x] 6.8 Write property test for cashflow history completeness
    - **Property 7: Cashflow History Completeness**
    - **Validates: Requirements 2.4**

  - [x] 6.9 Write property test for encrypted data at rest
    - **Property 24: Encrypted Data at Rest**
    - **Validates: Requirements 10.2, 10.6**

- [x] 7. Checkpoint - Cashflow Service Complete
  - Ensure all cashflow tests pass, ask the user if questions arise.

- [ ] 8. Investment Service
  - [ ] 8.1 Implement gain/loss calculation function
    - Create calculateGainLoss function
    - _Requirements: 3.3_

  - [ ] 8.2 Write property test for gain/loss calculation
    - **Property 12: Gain/Loss Calculation Invariant**
    - **Validates: Requirements 3.3**

  - [ ] 8.3 Implement investment and snapshot persistence with encryption
    - Create saveSnapshot function with upsert logic
    - Encrypt invested_amount and current_value before storing
    - Auto-create investment record if not exists
    - _Requirements: 3.2, 3.5, 10.2_

  - [ ] 8.4 Write property test for snapshot persistence round-trip
    - **Property 11: Investment Snapshot Persistence Round-Trip**
    - **Validates: Requirements 3.2**

  - [ ] 8.5 Write property test for snapshot upsert idempotence
    - **Property 14: Snapshot Upsert Idempotence**
    - **Validates: Requirements 3.5**

  - [ ] 8.6 Implement investment history retrieval with decryption
    - Create getSnapshotsByInvestment function
    - Create getSnapshotsByUserAndType function
    - Decrypt monetary values when retrieving
    - _Requirements: 3.4, 10.3, 10.5_

  - [ ] 8.7 Write property test for investment history completeness
    - **Property 13: Investment History Completeness**
    - **Validates: Requirements 3.4**

- [ ] 9. Checkpoint - Investment Service Complete
  - Ensure all investment tests pass, ask the user if questions arise.

- [ ] 10. Analytics Service
  - [ ] 10.1 Implement portfolio aggregation functions
    - Create getPortfolioSummary function
    - Create getInvestmentComparison function (Gold vs Mutual Fund)
    - _Requirements: 4.2, 4.4_

  - [ ] 10.2 Write property test for portfolio aggregation correctness
    - **Property 15: Portfolio Aggregation Correctness**
    - **Validates: Requirements 4.2, 4.4**

  - [ ] 10.3 Implement cashflow trend analytics
    - Create getCashflowTrend function
    - Create getPortfolioGrowth function
    - _Requirements: 4.1, 4.3_

- [ ] 11. Notification Service
  - [ ] 11.1 Implement email content builders
    - Create buildReminderEmailContent function
    - Create buildSummaryEmailContent function with all required fields
    - _Requirements: 6.3_

  - [ ] 11.2 Write property test for summary email content completeness
    - **Property 18: Summary Email Content Completeness**
    - **Validates: Requirements 6.3**

  - [ ] 11.3 Implement notification type selection logic
    - Create determineNotificationType function
    - Check if cashflow exists for current month
    - _Requirements: 6.1, 6.2_

  - [ ] 11.4 Write property test for notification type selection
    - **Property 17: Notification Type Selection**
    - **Validates: Requirements 6.1, 6.2**

  - [ ] 11.5 Implement email sending and logging
    - Create sendEmail function using Nodemailer
    - Create logNotification function
    - _Requirements: 6.4, 6.5_

  - [ ] 11.6 Write property test for notification logging completeness
    - **Property 19: Notification Logging Completeness**
    - **Validates: Requirements 6.4**

  - [ ] 11.7 Implement monthly notification scheduler
    - Create sendMonthlyNotifications function
    - Iterate all users and send appropriate notification
    - _Requirements: 6.1, 6.2_

- [ ] 12. AI Investment Recommendation Service
  - [ ] 12.1 Implement financial health analysis
    - Create analyzeFinancialHealth function
    - Calculate average_net_cashflow from cashflow history
    - Calculate cashflow_volatility (standard deviation)
    - Determine months_of_data count
    - _Requirements: 11.1_

  - [ ] 12.2 Implement portfolio balance analysis
    - Create analyzePortfolioBalance function
    - Calculate current percentage split between Gold and Mutual Fund
    - Calculate performance (gain/loss %) for each type
    - _Requirements: 11.3_

  - [ ] 12.3 Implement allocation calculation logic
    - Create calculateRecommendedAllocation function
    - Base allocation: 40% Gold, 60% Mutual Fund
    - Adjust for cashflow volatility (higher volatility = more gold)
    - Adjust for portfolio imbalance (rebalancing)
    - Adjust for performance trends
    - _Requirements: 11.2, 11.6_

  - [ ] 12.4 Write property test for allocation percentage sum
    - **Property 25: Allocation Percentage Sum Invariant**
    - **Validates: Requirements 11.2**

  - [ ] 12.5 Write property test for diversification constraint
    - **Property 27: Diversification Constraint**
    - **Validates: Requirements 11.6**

  - [ ] 12.6 Implement negative cashflow detection
    - Check if average_net_cashflow < 0
    - Set should_invest = false when negative
    - Add emergency fund warning
    - _Requirements: 11.5_

  - [ ] 12.7 Write property test for negative cashflow recommendation
    - **Property 26: Negative Cashflow Emergency Fund Recommendation**
    - **Validates: Requirements 11.5**

  - [ ] 12.8 Implement reasoning text generator (Bahasa Indonesia)
    - Create generateReasoningText function
    - Explain allocation in simple, clear Bahasa Indonesia
    - Include factors considered (cashflow stability, portfolio balance, etc.)
    - _Requirements: 11.4_

  - [ ] 12.9 Write property test for reasoning completeness
    - **Property 28: Recommendation Reasoning Completeness**
    - **Validates: Requirements 11.4**

  - [ ] 12.10 Implement main recommendation service
    - Create getInvestmentRecommendation function
    - Orchestrate all analysis and calculation functions
    - Return complete AllocationRecommendation object
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7_

- [ ] 13. User Settings Service
  - [ ] 13.1 Update Prisma schema for AI setting
    - Add ai_recommendation_enabled field to User model
    - Default value: true
    - Run migration
    - _Requirements: 12.4, 12.5_

  - [ ] 13.2 Implement settings service
    - Create getUserSettings function
    - Create updateAIRecommendationSetting function
    - Create isAIRecommendationEnabled function
    - _Requirements: 12.1, 12.4, 12.6_

  - [ ] 13.3 Write property test for AI setting toggle persistence
    - **Property 29: AI Setting Toggle Persistence**
    - **Validates: Requirements 12.4, 12.6**

  - [ ] 13.4 Write property test for AI setting default value
    - **Property 30: AI Setting Default Value**
    - **Validates: Requirements 12.5**

  - [ ] 13.5 Create settings API routes
    - GET /api/settings (get user settings)
    - PATCH /api/settings/ai-recommendation (toggle AI setting)
    - _Requirements: 12.1, 12.6_

- [ ] 14. Checkpoint - Services Complete
  - Ensure all service tests pass, ask the user if questions arise.

- [ ] 15. API Routes
  - [ ] 15.1 Create authentication API routes
    - POST /api/auth/register
    - Configure NextAuth routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 15.2 Create cashflow API routes
    - POST /api/cashflow (create/update)
    - GET /api/cashflow (history)
    - GET /api/cashflow/[month] (single month)
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 15.3 Create investment API routes
    - POST /api/investments/snapshot (create/update)
    - GET /api/investments (list investments)
    - GET /api/investments/[type]/history (snapshots by type)
    - _Requirements: 3.2, 3.4, 3.5_

  - [ ] 15.4 Create analytics API routes
    - GET /api/analytics/cashflow-trend
    - GET /api/analytics/portfolio
    - GET /api/analytics/comparison
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 15.5 Create AI recommendation API route
    - GET /api/analytics/recommendation
    - Check if AI recommendation is enabled for user first
    - Return allocation percentages, reasoning, and warnings
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 12.2_

  - [ ] 15.6 Create notification trigger API route
    - POST /api/notifications/send-monthly (for cron trigger)
    - _Requirements: 6.1, 6.2_

- [ ] 16. Frontend Pages
  - [ ] 16.1 Create authentication pages
    - /login page with form
    - /register page with form
    - _Requirements: 1.1, 1.3_

  - [ ] 16.2 Create dashboard page
    - /dashboard with summary widgets
    - Display net cashflow, portfolio value, recent activity
    - _Requirements: 4.1, 4.2_

  - [ ] 16.3 Create cashflow management page
    - /cashflow with input form and history table
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 16.4 Create investments management page
    - /investments with snapshot form and history
    - Separate sections for Gold and Mutual Fund
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 16.5 Create AI recommendation display on analytics page
    - Check if AI recommendation is enabled before displaying
    - Display recommended allocation percentages (pie chart)
    - Show reasoning text in Bahasa Indonesia
    - Display warnings if any (e.g., build emergency fund first)
    - Show investable amount suggestion
    - _Requirements: 11.4, 11.7, 12.2_

  - [ ] 16.6 Create settings page with AI toggle
    - /settings for user preferences
    - AI recommendation toggle with clear description
    - Email notification preferences
    - _Requirements: 6.1, 6.2, 12.1, 12.7_

- [ ] 17. Final Checkpoint - All Tests Pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property tests are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All API routes use the standard responseAPI format
