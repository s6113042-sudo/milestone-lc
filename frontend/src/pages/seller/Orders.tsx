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
  const [disputeLc,   setDisputeLc]   = useState<LetterOfCredit | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (!account) return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;

  // status 0 = 已建立（買方還未付款），1 = 已資金，2 = 已出貨，>2 = 結束
  const awaiting = lcs?.filter(lc => lc.status === 0) ?? [];
  const pending  = lcs?.filter(lc => lc.status === 1) ?? [];
  const shipped  = lcs?.filter(lc => lc.status === 2) ?? [];
  const archived = lcs?.filter(lc => lc.status >  2) ?? [];
  const total    = (lcs?.length ?? 0);

  return (
    <div className="page-container">
      {disputeLc && (
        <DisputeModal lc={disputeLc} onClose={() => setDisputeLc(null)} onDone={() => refetch()} />
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">賣方訂單</h2>
          <p className="page-subtitle">所有指定您為賣方的信用狀</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>重新整理</button>
      </div>

      {/* ── 流程說明 ── */}
      <div style={{
        display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden',
        border: '1px solid var(--border)', fontSize: 12,
      }}>
        {[
          { step: '1', label: '買方建立', sub: '等待買方付款', color: '#6b7280' },
          { step: '2', label: '資金已到位', sub: '確認後出貨', color: '#2563eb' },
          { step: '3', label: '出貨確認', sub: '等待倉庫驗貨', color: '#d97706' },
          { step: '4', label: '完成 / 結算', sub: '款項已釋放', color: '#16a34a' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 12px', background: 'var(--bg-card)',
            borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', background: s.color,
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{s.step}</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-h)', lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ color: 'var(--text)', lineHeight: 1.3 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 統計 ── */}
      {total > 0 && (
        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">全部</span><span className="stat-value">{total}</span></div>
          <div className="stat-item"><span className="stat-label">待付款</span><span className="stat-value" style={{ color: '#6b7280' }}>{awaiting.length}</span></div>
          <div className="stat-item"><span className="stat-label">待出貨</span><span className="stat-value" style={{ color: '#2563eb' }}>{pending.length}</span></div>
          <div className="stat-item"><span className="stat-label">待驗貨</span><span className="stat-value" style={{ color: '#d97706' }}>{shipped.length}</span></div>
          <div className="stat-item"><span className="stat-label">已結束</span><span className="stat-value" style={{ color: '#16a34a' }}>{archived.length}</span></div>
        </div>
      )}

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && total === 0 && (
        <div className="empty-state">
          <p>目前沒有以您的地址為賣方的信用狀</p>
          <p style={{ fontSize: 13 }}>請確認買方是否正確填入您的錢包地址</p>
        </div>
      )}

      {/* ── 待付款（CREATED）── */}
      {awaiting.length > 0 && (
        <section>
          <h3 className="section-title" style={{ color: '#6b7280' }}>步驟 1 · 等待買方付款（{awaiting.length}）</h3>
          <div className="lc-grid">
            {awaiting.map(lc => (
              <div key={lc.id} className="lc-card" style={{ opacity: 0.8 }}>
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
                      <span className="info-value mono">{lc.buyer.slice(0, 12)}…</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">出貨截止</span>
                      <span className="info-value">{formatDate(lc.ship_deadline_ms)}</span>
                    </div>
                  </div>
                </div>
                <div className="lc-card-actions">
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>等待買方存入資金後即可出貨</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 待出貨（FUNDED）── */}
      {pending.length > 0 && (
        <section style={{ marginTop: awaiting.length > 0 ? 32 : 0 }}>
          <h3 className="section-title" style={{ color: '#2563eb' }}>步驟 2 · 資金已到位，請出貨（{pending.length}）</h3>
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
                        <span className="info-value mono">{lc.buyer.slice(0, 12)}…</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">出貨截止</span>
                        <span className={`info-value${overdue ? ' text-danger' : ' text-warning'}`}>
                          {formatDate(lc.ship_deadline_ms)}
                          <br /><small>{daysLeft(lc.ship_deadline_ms)}</small>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="lc-card-actions">
                    {!overdue
                      ? <button className="btn btn-primary btn-sm" onClick={() => navigate(`/seller/confirm/${lc.id}`)}>填入物流單號並確認出貨</button>
                      : <span className="text-danger" style={{ fontSize: 13 }}>已逾期，買方可取回資金</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 已出貨待驗貨（SHIPPED）── */}
      {shipped.length > 0 && (
        <section style={{ marginTop: (awaiting.length + pending.length) > 0 ? 32 : 0 }}>
          <h3 className="section-title" style={{ color: '#d97706' }}>步驟 3 · 已出貨，等待倉庫驗貨（{shipped.length}）</h3>
          <div className="lc-grid">
            {shipped.map(lc => (
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
                      <span className="info-value mono">{lc.buyer.slice(0, 12)}…</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">物流單號</span>
                      <span className="info-value" style={{ fontWeight: 600 }}>{lc.shipment_ref ?? '—'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">提貨截止</span>
                      <span className="info-value">{formatDate(lc.pickup_deadline_ms)}</span>
                    </div>
                  </div>
                </div>
                <div className="lc-card-actions">
                  <button className="btn btn-danger btn-sm" onClick={() => setDisputeLc(lc)}>提出爭議</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 已結束（可折疊）── */}
      {archived.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <button
            onClick={() => setArchiveOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              textAlign: 'left',
            }}
          >
            <h3 className="section-title" style={{ margin: 0 }}>已結束（{archived.length}）</h3>
            <span style={{
              fontSize: 12, color: 'var(--text)', transition: 'transform .2s',
              display: 'inline-block', transform: archiveOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>▼</span>
          </button>
          {archiveOpen && (
            <div className="lc-grid" style={{ marginTop: 12 }}>
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
                        <span className="info-value mono">{lc.buyer.slice(0, 12)}…</span>
                      </div>
                      {lc.shipment_ref && (
                        <div className="info-item">
                          <span className="info-label">物流單號</span>
                          <span className="info-value">{lc.shipment_ref}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
