import { useCurrentAccount } from '@mysten/dapp-kit';
import { useLcListBySeller } from '../../hooks/useLcList';
import StatusBadge from '../../components/StatusBadge';
import { CURRENCY_SUI, MIST_PER_SUI } from '../../constants';
import type { LetterOfCredit } from '../../types';

function formatAmount(lc: LetterOfCredit) {
  const raw = BigInt(lc.amount);
  if (lc.currency === CURRENCY_SUI) {
    return `${(Number(raw) / Number(MIST_PER_SUI)).toFixed(4)} SUI`;
  }
  return `${(Number(raw) / 1_000_000).toFixed(2)} USDC`;
}

export default function Payments() {
  const account = useCurrentAccount();
  const { data: lcs, isLoading, refetch } = useLcListBySeller(account?.address);

  if (!account) {
    return (
      <div className="page-container">
        <div className="empty-state">請先連接錢包</div>
      </div>
    );
  }

  // Settled (2), Completed (3), Refunded (6) are payment history
  const settled = lcs?.filter(lc => [2, 3, 6].includes(lc.status)) ?? [];
  const total = settled.reduce((sum, lc) => sum + BigInt(lc.amount), 0n);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">收款記錄</h2>
          <p className="page-subtitle">已完成或已結算的信用狀</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>重新整理</button>
      </div>

      {settled.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">已完成</span>
            <span className="stat-value">{settled.length} 筆</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">累計金額（MIST/raw）</span>
            <span className="stat-value">{total.toString()}</span>
          </div>
        </div>
      )}

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && settled.length === 0 && (
        <div className="empty-state">尚無收款記錄</div>
      )}

      <div className="table-container">
        {settled.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>L/C ID</th>
                <th>買方</th>
                <th>金額</th>
                <th>物流單號</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {settled.map(lc => (
                <tr key={lc.id}>
                  <td className="mono">{lc.id.slice(0, 12)}…</td>
                  <td className="mono">{lc.buyer.slice(0, 10)}…</td>
                  <td><strong>{formatAmount(lc)}</strong></td>
                  <td>{lc.shipment_ref ?? '—'}</td>
                  <td><StatusBadge status={lc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
