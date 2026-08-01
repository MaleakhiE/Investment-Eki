export function safeDatabaseErrorCode(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && /^P\d{4}$/.test(error.code)
  ) {
    return error.code;
  }
  return 'UNCLASSIFIED';
}
