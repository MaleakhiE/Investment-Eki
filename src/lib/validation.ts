/**
 * Validation Utilities
 * 
 * Provides validation functions for user inputs including:
 * - Month format (YYYY-MM)
 * - Monetary values (non-negative decimals)
 * - Investment types (GOLD/MUTUAL_FUND)
 * - Email and password validation
 * - Composite input validation for cashflow and snapshots
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CashflowInput {
  month: string;
  income: number;
  expense_rent: number;
  expense_living: number;
  expense_other: number;
}

export type InvestmentType = 'GOLD' | 'MUTUAL_FUND';

export interface InvestmentSnapshotInput {
  type: InvestmentType | string;
  month: string;
  invested_amount: number;
  current_value: number;
}

/**
 * Validates month format (YYYY-MM)
 * Valid months are 01-12, valid years are 4 digits
 */
export function validateMonth(month: string): ValidationResult {
  const errors: string[] = [];

  if (typeof month !== 'string') {
    return { valid: false, errors: ['Month must be a string'] };
  }

  const monthRegex = /^(\d{4})-(0[1-9]|1[0-2])$/;
  if (!monthRegex.test(month)) {
    errors.push('Month must be in YYYY-MM format with valid month (01-12)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates monetary values (non-negative decimals)
 */
export function validateMonetaryValue(value: number, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number') {
    return { valid: false, errors: [`${fieldName} must be a number`] };
  }

  if (isNaN(value)) {
    errors.push(`${fieldName} must be a valid number`);
  } else if (value < 0) {
    errors.push(`${fieldName} must be non-negative`);
  } else if (!isFinite(value)) {
    errors.push(`${fieldName} must be a finite number`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates investment type (GOLD or MUTUAL_FUND only)
 */
export function validateInvestmentType(type: string): ValidationResult {
  const errors: string[] = [];

  if (typeof type !== 'string') {
    return { valid: false, errors: ['Investment type must be a string'] };
  }

  const validTypes: InvestmentType[] = ['GOLD', 'MUTUAL_FUND'];
  if (!validTypes.includes(type as InvestmentType)) {
    errors.push('Investment type must be either GOLD or MUTUAL_FUND');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (typeof email !== 'string') {
    return { valid: false, errors: ['Email must be a string'] };
  }

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    // Basic email regex - checks for @ and domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates password requirements
 * - Minimum 8 characters
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates complete cashflow input
 */
export function validateCashflowInput(input: Partial<CashflowInput>): ValidationResult {
  const errors: string[] = [];

  // Check for missing required fields
  if (input.month === undefined || input.month === null) {
    errors.push('month is required');
  }
  if (input.income === undefined || input.income === null) {
    errors.push('income is required');
  }
  if (input.expense_rent === undefined || input.expense_rent === null) {
    errors.push('expense_rent is required');
  }
  if (input.expense_living === undefined || input.expense_living === null) {
    errors.push('expense_living is required');
  }
  if (input.expense_other === undefined || input.expense_other === null) {
    errors.push('expense_other is required');
  }

  // If any required fields are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate field types
  if (typeof input.month !== 'string') {
    errors.push('month must be a string');
  }
  if (typeof input.income !== 'number') {
    errors.push('income must be a number');
  }
  if (typeof input.expense_rent !== 'number') {
    errors.push('expense_rent must be a number');
  }
  if (typeof input.expense_living !== 'number') {
    errors.push('expense_living must be a number');
  }
  if (typeof input.expense_other !== 'number') {
    errors.push('expense_other must be a number');
  }

  // If type validation failed, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate month format
  const monthValidation = validateMonth(input.month as string);
  if (!monthValidation.valid) {
    errors.push(...monthValidation.errors);
  }

  // Validate monetary values
  const incomeValidation = validateMonetaryValue(input.income as number, 'income');
  if (!incomeValidation.valid) {
    errors.push(...incomeValidation.errors);
  }

  const rentValidation = validateMonetaryValue(input.expense_rent as number, 'expense_rent');
  if (!rentValidation.valid) {
    errors.push(...rentValidation.errors);
  }

  const livingValidation = validateMonetaryValue(input.expense_living as number, 'expense_living');
  if (!livingValidation.valid) {
    errors.push(...livingValidation.errors);
  }

  const otherValidation = validateMonetaryValue(input.expense_other as number, 'expense_other');
  if (!otherValidation.valid) {
    errors.push(...otherValidation.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates complete investment snapshot input
 */
export function validateSnapshotInput(input: Partial<InvestmentSnapshotInput>): ValidationResult {
  const errors: string[] = [];

  // Check for missing required fields
  if (input.type === undefined || input.type === null) {
    errors.push('type is required');
  }
  if (input.month === undefined || input.month === null) {
    errors.push('month is required');
  }
  if (input.invested_amount === undefined || input.invested_amount === null) {
    errors.push('invested_amount is required');
  }
  if (input.current_value === undefined || input.current_value === null) {
    errors.push('current_value is required');
  }

  // If any required fields are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate field types
  if (typeof input.type !== 'string') {
    errors.push('type must be a string');
  }
  if (typeof input.month !== 'string') {
    errors.push('month must be a string');
  }
  if (typeof input.invested_amount !== 'number') {
    errors.push('invested_amount must be a number');
  }
  if (typeof input.current_value !== 'number') {
    errors.push('current_value must be a number');
  }

  // If type validation failed, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate investment type
  const typeValidation = validateInvestmentType(input.type as string);
  if (!typeValidation.valid) {
    errors.push(...typeValidation.errors);
  }

  // Validate month format
  const monthValidation = validateMonth(input.month as string);
  if (!monthValidation.valid) {
    errors.push(...monthValidation.errors);
  }

  // Validate monetary values
  const investedValidation = validateMonetaryValue(input.invested_amount as number, 'invested_amount');
  if (!investedValidation.valid) {
    errors.push(...investedValidation.errors);
  }

  const currentValidation = validateMonetaryValue(input.current_value as number, 'current_value');
  if (!currentValidation.valid) {
    errors.push(...currentValidation.errors);
  }

  return { valid: errors.length === 0, errors };
}
