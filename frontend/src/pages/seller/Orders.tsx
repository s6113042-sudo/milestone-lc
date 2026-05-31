import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import { useLcListBySeller } from '../../hooks/useLcList';
import { useRaiseDispute } from '../../hooks/useRaiseDispute';
import StatusBadge from '../../components/StatusBadge';
import { CURRENCY_SUI, MIST_PER_SUI } from '../../constants';
import type { LetterOfCredit } from '../../types';

function formatAmount(lc: LetterOfCredit) {
  const raw = BigInt(lc.amount);
  return lc.currency === CURRENCY_SUI
    ? `${(Number(raw) / Number(MIST_PER_SUI)).toFixed(4)} SUI`
    : `${(Number(raw) / 1_000_000).toFixed(2)} USDC`;
}

function formatDate(ms: string) {
  return new Date(Number(ms)).toLocaleDateString('zh-TW');
}

function daysLeft(ms: string) {
  const diff  = Number(ms) - Date.now();
  const days  = Math.ceil(diff / 86400_000);
  return days > 0 ? `${days} 天後截止` : '已逾期';
}

// ── 爭議 Modal（賣方版）────────────────────────────────────────────────────

function DisputeModal({ lc, onClose, onDone }: { lc: LetterOfCredit; onClose: () => void; onDone: () => void }) {
  const { raiseDispute, isPending, error } = useRaiseDispute();
  const [evidence, setEvidence] = useState('');
  const [ok, setOk] = useState(false);

  const handleSubmit = async () => {
    await raiseDispute(lc.id, evidence);
    setOk(true);
    setTimeout(() => { onDone(); onClose(); }, 1500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 460, maxWidth: '92vw' }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>提出爭議</h3>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
          L/C #{lc.id.slice(0, 12)}…　金額：{formatAmount(lc)}
        </p>

        {ok    && <div className="alert alert-success" style={{ marginBottom: 12 }}>爭議已提出，等待管理員仲裁。</div>}
        {error && <div className="alert alert-error"   style={{ marginBottom: 12 }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">爭議說明</label>
          <textarea className="form-textarea" rows={4} placeholder="說明爭議原因（貨物問題、款項爭議等）..." value={evidence} onChange={e => setEvidence(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-danger" onClick={handleSubmit} disabled={isPending || !evidence.trim()}>
            {isPending ? '提交中...' : '確認提出爭議'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

// ── 主頁面 ─────────────────────────────────────────────────────────────────

export default function Orders() {
  const account  = useCurrentAccount();
  const navigate = useNavigate();
  const { data: lcs, isLoading, refetch } = useLcListBySeller(account?.address);
  const [disputeLc, setDisputeLc] = useState<LetterOfCredit | null>(null);

  if (!account) return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;

  const pending  = lcs?.filter(lc => lc.status === 1) ?? [];
  const settled  = lcs?.filter(lc => lc.status === 2) ?? [];   // SETTLED — 可提出爭議
  const archived = lcs?.filter(lc => lc.status > 2)  ?? [];

  return (
    <div className="page-container">
      {disputeLc && (
        <DisputeModal lc={disputeLc} onClose={() => setDisputeLc(null)} onDone={() => refetch()} />
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">待處理訂單</h2>
          <p className="page-subtitle">已收到資金、等待出貨確認的信用狀</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>重新整理</button>
      </div>

      {isLoading && <div className="loading">載入中...</div>}

      {/* ── 待出貨（FUNDED）── */}
      {!isLoading && pending.length === 0 && settled.length === 0 && archived.length === 0 && (
        <div className="empty-state">目前無訂單</div>
      )}

      {pending.length > 0 && (
        <section>
          <h3 className="section-title">待出貨（{pending.length}）</h3>
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
                        <span className={`info-value${overdue ? ' text-danger' : ' text-warning'}`} style={{ fontSize: 13, marginTop: 4 }}>
                          {formatDate(lc.ship_deadline_ms)}（{daysLeft(lc.ship_deadline_ms)}）
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="lc-card-actions">
                    {!overdue
                      ? <button className="btn btn-primary btn-sm" onClick={() => navigate(`/seller/confirm/${lc.id}`)}>確認出貨</button>
                      : <span className="text-danger" style={{ fontSize: 13 }}>已逾期，買方可取回資金</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 已出貨待驗貨（SETTLED）— 可提出爭議 ── */}
      {settled.length > 0 && (
        <section style={{ marginTop: pending.length > 0 ? 32 : 0 }}>
          <h3 className="section-title">已出貨／待驗貨（{settled.length}）</h3>
          <div className="lc-grid">
            {settled.map(lc => (
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
                    <div className="info-item">
                      <span className="info-label">物流單號</span>
                      <span className="info-value">{lc.shipment_ref ?? '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">提貨截止</span>
                      <span className="info-value">{formatDate(lc.pickup_deadline_ms)}</span>
                    </div>
                  </div>
                </div>
                <div className="lc-card-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => setDisputeLc(lc)}>
                    提出爭議
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 歷史 ── */}
      {archived.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 className="section-title">歷史記錄（{archived.length}）</h3>
          <div className="lc-grid">
            {archived.map(lc => (
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
