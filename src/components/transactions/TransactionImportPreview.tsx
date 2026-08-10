'use client';

import { useState } from 'react';

interface ImportRow {
  rowNumber: number;
  input: { date: string; type: string; category: string; description: string; amount: number; account?: string | null } | null;
  errors: string[];
  duplicateOf: number | null;
}

interface Preview {
  rows: ImportRow[];
  validRows: number;
  invalidRows: number;
  duplicateRows: number[];
}

export default function TransactionImportPreview() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus('loading');
    setMessage('');
    setPreview(null);
    try {
      const response = await fetch('/api/transactions/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: await file.text() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.responseDetails?.errors?.join(', ') || data.responseMessage || 'Unable to preview CSV');
      setPreview(data.responseDetails);
      setStatus('idle');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to preview CSV');
      setStatus('error');
    }
  };

  return (
    <section aria-labelledby="transaction-import-title" className="rounded-xl border border-[#bce9de] bg-[#eaf8f4] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="transaction-import-title" className="font-semibold text-[#16332f]">Review a CSV import</h3>
          <p className="mt-1 max-w-2xl text-xs text-zinc-600">Preview manual statement rows and duplicates before anything is saved. CSV must include date, type, category, description, and amount columns.</p>
        </div>
        <label className="cursor-pointer rounded-lg border border-[#00a88a] bg-white px-3 py-2 text-xs font-semibold text-[#087f6b] hover:bg-[#f5fffc]">
          {status === 'loading' ? 'Reading CSV…' : 'Choose CSV'}
          <input aria-label="Choose transaction CSV" type="file" accept=".csv,text/csv" disabled={status === 'loading'} onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ''; }} className="sr-only" />
        </label>
      </div>
      {status === 'loading' && <p role="status" className="mt-3 text-xs text-[#087f6b]">Checking rows and duplicate fingerprints…</p>}
      {status === 'error' && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p>}
      {preview && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs" aria-label="Import preview summary">
            <span className="rounded-full bg-white px-3 py-1 text-[#087f6b]">Valid: {preview.validRows}</span>
            <span className="rounded-full bg-white px-3 py-1 text-red-700">Needs review: {preview.invalidRows}</span>
            <span className="rounded-full bg-white px-3 py-1 text-amber-700">Duplicates: {preview.duplicateRows.length}</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#bce9de] bg-white">
            <table className="min-w-full text-left text-xs">
              <caption className="sr-only">Transaction import preview rows</caption>
              <thead className="border-b border-[#dcece8] text-zinc-600"><tr><th scope="col" className="px-3 py-2">Row</th><th scope="col" className="px-3 py-2">Date</th><th scope="col" className="px-3 py-2">Description</th><th scope="col" className="px-3 py-2">Status</th></tr></thead>
              <tbody>{preview.rows.map((row) => <tr key={row.rowNumber} className="border-b border-[#edf6f3] last:border-0"><th scope="row" className="px-3 py-2 font-medium">{row.rowNumber}</th><td className="px-3 py-2">{row.input?.date ?? '—'}</td><td className="px-3 py-2">{row.input?.description ?? row.errors.join('; ')}</td><td className="px-3 py-2">{row.errors.length > 0 ? 'Invalid' : row.duplicateOf ? `Duplicate of row ${row.duplicateOf}` : 'Ready for review'}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-600">This preview does not save transactions. Review the rows before a future import-confirmation step.</p>
        </div>
      )}
    </section>
  );
}
