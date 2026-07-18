export interface AccountSummary {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  balance: number;
  opening_balance: number;
  color: string | null;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
}).format(value);

export function AccountCard({ account, actions }: { account: AccountSummary; actions?: React.ReactNode }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-3xl border border-[#dcece8] bg-white p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#16332f]" title={account.name}>{account.name}</p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-zinc-500">{account.type}</p>
        </div>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color || '#00a88a' }} aria-hidden="true" />
      </div>
      <p className="mt-5 break-words text-xl font-bold leading-tight text-[#16332f]">{formatCurrency(account.balance)}</p>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

export function AccountTransferLabel({ source, destination }: { source: string; destination: string }) {
  return <span className="min-w-0 text-xs text-zinc-500">Transfer: <strong>{source}</strong> to <strong>{destination}</strong></span>;
}
