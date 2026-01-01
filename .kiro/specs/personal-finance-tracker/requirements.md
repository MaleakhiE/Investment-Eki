# Requirements Document

## Introduction

A personal finance and investment tracking web application designed to track monthly income and expenses, manage investments limited to Gold (Emas Digital) and Mutual Funds (Reksa Dana), provide cashflow and portfolio analysis, and send monthly SMTP email notifications. The system targets single-user personal finance tracking with architecture extensible to multi-user.

## Glossary

- **System**: The Personal Finance & Investment Tracker web application
- **User**: An authenticated individual using the application for personal finance tracking
- **Cashflow**: The monthly record of income minus expenses
- **Investment**: A financial asset tracked by the system, limited to Gold or Mutual Fund types
- **Snapshot**: A point-in-time record of an investment's invested amount and current market value
- **Net_Cashflow**: The calculated difference between monthly income and total expenses
- **Reminder_Email**: An automated email sent when monthly data has not been entered
- **Summary_Email**: An automated email containing the monthly financial overview
- **API_Response**: The standardized JSON response format used by all API endpoints

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to securely register and login to the application, so that my financial data is protected and accessible only to me.

#### Acceptance Criteria

1. WHEN a user submits registration with email and password, THE System SHALL create a new user account with the password hashed using bcrypt
2. WHEN a user attempts to register with an existing email, THE System SHALL reject the registration and return an error response
3. WHEN a user submits valid login credentials, THE System SHALL authenticate the user and create a JWT session
4. WHEN a user submits invalid login credentials, THE System SHALL reject the login and return an error response
5. WHEN an unauthenticated user attempts to access a protected route, THE System SHALL redirect to the login page
6. THE System SHALL store authentication secrets in environment variables

### Requirement 2: Cashflow Management

**User Story:** As a user, I want to record my monthly income and expenses, so that I can track my financial health over time.

#### Acceptance Criteria

1. WHEN a user submits monthly cashflow data with income and expense breakdown, THE System SHALL calculate total_expense as the sum of expense_rent, expense_living, and expense_other
2. WHEN a user submits monthly cashflow data, THE System SHALL calculate net_cashflow as income minus total_expense
3. WHEN a user submits cashflow data for a month, THE System SHALL persist the record with all expense categories and calculated values
4. WHEN a user requests cashflow history, THE System SHALL return all monthly cashflow records for that user
5. WHEN a user submits cashflow data for an existing month, THE System SHALL update the existing record
6. THE System SHALL validate that all monetary values are non-negative decimal numbers

### Requirement 3: Investment Management

**User Story:** As a user, I want to track my Gold and Mutual Fund investments, so that I can monitor my portfolio performance.

#### Acceptance Criteria

1. WHEN a user creates an investment, THE System SHALL accept only GOLD or MUTUAL_FUND as valid investment types
2. WHEN a user submits an investment snapshot, THE System SHALL record the invested_amount and current_value for the specified month
3. WHEN a user submits an investment snapshot, THE System SHALL calculate the unrealized gain_loss as current_value minus invested_amount
4. WHEN a user requests investment history, THE System SHALL return all snapshots for the specified investment
5. WHEN a user submits a snapshot for an existing investment and month, THE System SHALL update the existing snapshot
6. THE System SHALL validate that invested_amount and current_value are non-negative decimal numbers

### Requirement 4: Analytics and Insights

**User Story:** As a user, I want to view analytics about my finances, so that I can make informed financial decisions.

#### Acceptance Criteria

1. WHEN a user requests cashflow analytics, THE System SHALL return monthly net_cashflow trend data
2. WHEN a user requests portfolio analytics, THE System SHALL return total invested versus current value across all investments
3. WHEN a user requests portfolio analytics, THE System SHALL return portfolio growth over time
4. WHEN a user requests portfolio comparison, THE System SHALL return separate summaries for Gold and Mutual Fund investments

### Requirement 5: API Response Standard

**User Story:** As a developer, I want all API responses to follow a consistent format, so that client applications can reliably parse responses.

#### Acceptance Criteria

1. THE System SHALL return all API responses with responseCode, responseStatus, responseMessage, and responseDetails fields
2. WHEN an API operation succeeds, THE System SHALL return responseStatus as "SUCCESS"
3. WHEN an API operation fails, THE System SHALL return responseStatus as "ERROR"
4. THE System SHALL include the appropriate HTTP status code in responseCode
5. THE System SHALL include a human-readable message in responseMessage
6. THE System SHALL include operation-specific data or null in responseDetails

### Requirement 6: Monthly Email Notifications

**User Story:** As a user, I want to receive monthly email notifications, so that I am reminded to update my data and can review my financial summary.

#### Acceptance Criteria

1. WHEN the monthly scheduler runs and cashflow data does not exist for the current month, THE System SHALL send a Reminder_Email to the user
2. WHEN the monthly scheduler runs and cashflow data exists for the current month, THE System SHALL send a Summary_Email to the user
3. WHEN sending a Summary_Email, THE System SHALL include month, total income, total expense, net cashflow, Gold investment summary, and Mutual Fund investment summary
4. WHEN an email is sent, THE System SHALL log the notification with user_id, month, type, and sent_at
5. THE System SHALL use SMTP configuration from environment variables for email delivery

### Requirement 7: Data Validation and Error Handling

**User Story:** As a user, I want the system to validate my inputs, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a user submits data with missing required fields, THE System SHALL return an error response with responseCode 400
2. WHEN a user submits data with invalid field types, THE System SHALL return an error response with responseCode 400
3. WHEN a user submits a month value, THE System SHALL validate it matches the YYYY-MM format
4. WHEN a database operation fails, THE System SHALL return an error response with responseCode 500
5. IF an unauthorized request is made, THEN THE System SHALL return an error response with responseCode 401

### Requirement 8: Database Persistence

**User Story:** As a user, I want my financial data to be reliably stored, so that I can access historical records.

#### Acceptance Criteria

1. THE System SHALL store user data in the users table with id, email, password_hash, created_at, and updated_at fields
2. THE System SHALL store cashflow data in the monthly_cashflow table with foreign key reference to users
3. THE System SHALL store investment metadata in the investments table with type as ENUM of GOLD or MUTUAL_FUND
4. THE System SHALL store investment snapshots in the investment_snapshots table with foreign key reference to investments
5. THE System SHALL store notification logs in the notification_logs table with type as ENUM of REMINDER or SUMMARY
6. THE System SHALL use DECIMAL(15,2) for all monetary values to ensure precision

### Requirement 9: Database Migration and Seeding

**User Story:** As a developer, I want database migrations and seed data, so that I can set up the application consistently across environments.

#### Acceptance Criteria

1. THE System SHALL provide Prisma migration scripts to create all database tables
2. WHEN running database seed, THE System SHALL create a default admin user with hashed password
3. WHEN running database seed, THE System SHALL create sample cashflow and investment data for testing
4. THE System SHALL document migration and seed commands in the project README

### Requirement 10: Sensitive Data Encryption at Rest

**User Story:** As a user, I want my sensitive financial data encrypted in the database, so that even database administrators cannot read my personal information.

#### Acceptance Criteria

1. THE System SHALL encrypt user email addresses before storing in the database
2. THE System SHALL encrypt all monetary values (income, expenses, invested_amount, current_value) before storing in the database
3. THE System SHALL decrypt encrypted fields when retrieving data for application use
4. THE System SHALL store the encryption key in environment variables, never in code
5. WHEN displaying data to the user, THE System SHALL show decrypted values
6. IF someone queries the database directly, THEN THE System SHALL have stored only encrypted values for sensitive fields

### Requirement 11: AI Investment Allocation Recommendation

**User Story:** As a user, I want to receive AI-powered recommendations on how to allocate my investable funds between Gold and Mutual Funds, so that I can make informed investment decisions based on my financial situation.

#### Acceptance Criteria

1. WHEN a user requests investment recommendation, THE System SHALL analyze the user's net_cashflow history to determine investable surplus
2. WHEN generating recommendation, THE System SHALL calculate recommended percentage allocation for Gold (0-100%) and Mutual Fund (0-100%) that totals 100%
3. WHEN generating recommendation, THE System SHALL consider the user's current portfolio balance between Gold and Mutual Fund
4. WHEN generating recommendation, THE System SHALL provide a clear explanation in simple language (Bahasa Indonesia) for why the allocation is recommended
5. WHEN the user has negative average net_cashflow, THE System SHALL recommend focusing on building emergency fund first before investing
6. WHEN generating recommendation, THE System SHALL consider investment diversification principles (not putting all eggs in one basket)
7. THE System SHALL display the recommendation with percentage breakdown and reasoning on the analytics page
8. WHEN user's investment history shows high volatility preference, THE System SHALL adjust recommendation accordingly

### Requirement 12: AI Recommendation Settings

**User Story:** As a user, I want to enable or disable AI investment recommendations, so that I can choose whether to see AI-powered suggestions based on my preference.

#### Acceptance Criteria

1. THE System SHALL provide a toggle setting to enable/disable AI investment recommendations
2. WHEN AI recommendation is disabled, THE System SHALL not display recommendation section on analytics page
3. WHEN AI recommendation is enabled, THE System SHALL display recommendation section on analytics page
4. THE System SHALL store the AI recommendation preference per user in the database
5. WHEN a new user registers, THE System SHALL default AI recommendation setting to enabled
6. WHEN a user changes AI recommendation setting, THE System SHALL persist the change immediately
7. THE System SHALL display the AI toggle setting on the settings page with clear description
