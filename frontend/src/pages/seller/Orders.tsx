import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
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

function formatDate(ms: string) {
  return new Date(Number(ms)).toLocaleDateString('zh-TW');
}

function daysLeft(ms: string) {
  const diff = Number(ms) - Date.now();
  const days = Math.ceil(diff / 86400_000);
  return days > 0 ? `${days} 天後截止` : '已逾期';
}

export default function Orders() {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const { data: lcs, isLoading, refetch } = useLcListBySeller(account?.address);

  if (!account) {
    return (
      <div className="page-container">
        <div className="empty-state">請先連接錢包</div>
      </div>
    );
  }

  // Show FUNDED (status=1) as pending orders
  const pending = lcs?.filter(lc => lc.status === 1) ?? [];
  const other = lcs?.filter(lc => lc.status !== 1) ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">待處理訂單</h2>
          <p className="page-subtitle">已收到資金、等待出貨確認的信用狀</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>重新整理</button>
      </div>

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && pending.length === 0 && (
        <div className="empty-state">目前無待處理訂單</div>
      )}

      <div className="lc-grid">
        {pending.map(lc => {
          const overdue = Date.now() > Number(lc.ship_deadline_ms);
          return (
            <div key={lc.id} className={`lc-card${overdue ? ' overdue' : ''}`}>
              <div className="lc-card-header">
                <div>
                  <div className="lc-id">#{lc.id.slice(0, 10)}…</div>
                  <div className="lc-amount">{formatAmount(lc)}</div>
                </div>
                <StatusBadge status={lc.status} />
              </div>
              <div className="lc-card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">買方</span>
                    <span className="info-value mono">{lc.buyer.slice(0, 10)}…</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">出貨截止</span>
                    <span className={`info-value${overdue ? ' text-danger' : ' text-warning'}`}>
                      {formatDate(lc.ship_deadline_ms)}（{daysLeft(lc.ship_deadline_ms)}）
                    </span>
                  </div>
                </div>
              </div>
              <div className="lc-card-actions">
                {!overdue && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/seller/confirm/${lc.id}`)}
                  >
                    確認出貨
                  </button>
                )}
                {overdue && (
                  <span className="text-danger" style={{ fontSize: 13 }}>
                    已逾期，買方可取回資金
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {other.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 className="section-title">其他訂單</h3>
          <div className="lc-grid">
            {other.map(lc => (
              <div key={lc.id} className="lc-card">
                <div className="lc-card-header">
                  <div>
                    <div className="lc-id">#{lc.id.slice(0, 10)}…</div>
                    <div className="lc-amount">{formatAmount(lc)}</div>
                  </div>
                  <StatusBadge status={lc.status} />
                </div>
                <div className="lc-card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">買方</span>
                      <span className="info-value mono">{lc.buyer.slice(0, 10)}…</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
