export function parseInvestmentHistories(goldData: unknown, mutualFundData: unknown) {
  const gold = getResponseDetails(goldData);
  const mutualFund = getResponseDetails(mutualFundData);
  if (!Array.isArray(gold) || !Array.isArray(mutualFund)) return null;
  return { gold, mutualFund };
}

function getResponseDetails(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('responseDetails' in value)) return null;
  return value.responseDetails;
}
