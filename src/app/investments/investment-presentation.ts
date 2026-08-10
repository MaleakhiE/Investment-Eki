export type InvestmentReturnPresentation = Readonly<{
  tone: 'neutral' | 'positive' | 'negative';
  amountPrefix: '' | '+' | '-';
  percentage: string | null;
}>;

export function getInvestmentReturnPresentation(
  invested: number,
  gainLoss: number,
): InvestmentReturnPresentation {
  if (!Number.isFinite(invested) || !Number.isFinite(gainLoss) || invested <= 0) {
    return { tone: 'neutral', amountPrefix: '', percentage: null };
  }

  return {
    tone: gainLoss > 0 ? 'positive' : gainLoss < 0 ? 'negative' : 'neutral',
    amountPrefix: gainLoss > 0 ? '+' : gainLoss < 0 ? '-' : '',
    percentage: ((gainLoss / invested) * 100).toFixed(1),
  };
}
