import { useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useTreasury } from '../../hooks/useTreasury';
import { useAdminResolve } from '../../hooks/useAdminResolve';
import { useReplenish } from '../../hooks/useReplenish';
import { useWithdrawFees } from '../../hooks/useWithdrawFees';
import { LC_CORE, MIST_PER_SUI } from '../../constants';

function formatSui(mist: string)  { return `${(Number(mist) / Number(MIST_PER_SUI)).toFixed(4)} SUI`; }
function formatUsdc(raw: string)  { return `${(Number(raw)  / 1_000_000).toFixed(2)} USDC`; }

function HealthBar({ value, label }: { value: number; label: string }) {
  const pct   = Math.min(100, Math.round(value * 100));
  const color = pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
        <span>{label}</span>
        <strong style={{ color }}>{pct}%</strong>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function ActionResult({ ok, err }: { ok: string; err: string }) {
  if (ok)  return <div className="alert alert-success" style={{ marginTop: 8 }}>{ok}</div>;
  if (err) return <div className="alert alert-error"   style={{ marginTop: 8 }}>{err}</div>;
  return null;
}

export default function AdminDashboard() {
  const account  = useCurrentAccount();
  const client   = useSuiClient();
  // Treasury 是單一共享物件，直接打鏈最準確
  const { data: treasury, isLoading: tLoading, refetch: refetchTreasury } = useTreasury();
  const { adminResolve, isPending: resolving } = useAdminResolve();
  const { replenishSui, replenishUsdc, isPending: replenishing } = useReplenish();
  const { withdrawSui, withdrawUsdc, isPending: withdrawing } = useWithdrawFees();

  const [lcId,           setLcId]           = useState('');
  const [resolveMsg,     setResolveMsg]     = useState({ ok: '', err: '' });
  const [replenishMsg,   setReplenishMsg]   = useState({ ok: '', err: '' });
  const [withdrawMsg,    setWithdrawMsg]    = useState({ ok: '', err: '' });

  const { data: disputes } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const events = await client.queryEvents({
        query: { MoveEventType: `${LC_CORE}::LCDisputed` },
        limit: 50,
      });
      return events.data.map(e => e.parsedJson as { lc_id: string; raised_by: string });
    },
    staleTime: 15_000,
  });

  const suiHealth  = treasury ? Number(treasury.sui_buffer)  / Math.max(1, Number(treasury.pending_sui))  : 0;
  const usdcHealth = treasury ? Number(treasury.usdc_buffer) / Math.max(1, Number(treasury.pending_usdc)) : 0;

  const withFeedback = async (
    fn: () => Promise<unknown>,
    setState: (v: { ok: string; err: string }) => void,
    okMsg: string,
  ) => {
    setState({ ok: '', err: '' });
    try {
      await fn();
      setState({ ok: okMsg, err: '' });
      refetchTreasury();
    } catch (e) {
      setState({ ok: '', err: String(e) });
    }
  };

  const handleResolve = (payToBuyer: boolean) =>
    withFeedback(
      () => { if (!lcId.trim()) throw new Error('請輸入 L/C ID'); return adminResolve(lcId.trim(), payToBuyer); },
      setResolveMsg,
      `已裁決：支付給${payToBuyer ? '買方' : '賣方'}`,
    );

  if (!account) return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">協議管理</h2>
          <p className="page-subtitle">金庫健康度、replenish、仲裁</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetchTreasury()}>重新整理</button>
      </div>

      {tLoading && <div className="loading">載入金庫資料...</div>}

      {/* ── 金庫狀態 ── */}
      {treasury && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* SUI */}
          <div className="card">
            <h3 className="section-title">SUI 金庫</h3>
            <HealthBar value={suiHealth} label="備付率（Buffer / Pending）" />
            <div className="info-grid">
              <div className="info-item"><span className="info-label">可用緩衝</span><span className="info-value">{formatSui(treasury.sui_buffer)}</span></div>
              <div className="info-item"><span className="info-label">haSUI 持倉</span><span className="info-value">{(Number(treasury.hasui_held) / 1e9).toFixed(4)} haSUI</span></div>
              <div className="info-item"><span className="info-label">待贖回</span><span className="info-value">{formatSui(treasury.pending_sui)}</span></div>
              <div className="info-item"><span className="info-label">協議手續費</span><span className="info-value">{formatSui(treasury.protocol_fee_sui)}</span></div>
            </div>
          </div>

          {/* USDC */}
          <div className="card">
            <h3 className="section-title">USDC 金庫</h3>
            <HealthBar value={usdcHealth} label="備付率（Buffer / Pending）" />
            <div className="info-grid">
              <div className="info-item"><span className="info-label">可用緩衝</span><span className="info-value">{formatUsdc(treasury.usdc_buffer)}</span></div>
              <div className="info-item"><span className="info-label">sCoin 持倉</span><span className="info-value">{(Number(treasury.scoin_held) / 1e6).toFixed(2)} sCoin</span></div>
              <div className="info-item"><span className="info-label">待贖回</span><span className="info-value">{formatUsdc(treasury.pending_usdc)}</span></div>
              <div className="info-item"><span className="info-label">協議手續費</span><span className="info-value">{formatUsdc(treasury.protocol_fee_usdc)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── 手動 Replenish ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">手動補充金庫（Replenish）</h3>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
          贖回 haSUI → SUI 或 sCoin → USDC，補充即時流動性緩衝。Keeper Bot 每 5 分鐘自動執行，此處可手動觸發。
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" disabled={replenishing}
            onClick={() => withFeedback(replenishSui, setReplenishMsg, 'replenish_sui 完成')}>
            {replenishing ? '執行中...' : '補充 SUI 金庫'}
          </button>
          <button className="btn btn-primary" disabled={replenishing}
            onClick={() => withFeedback(replenishUsdc, setReplenishMsg, 'replenish_usdc 完成')}>
            {replenishing ? '執行中...' : '補充 USDC 金庫'}
          </button>
        </div>
        <ActionResult ok={replenishMsg.ok} err={replenishMsg.err} />
      </div>

      {/* ── 提取手續費 ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">提取協議手續費</h3>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
          將累積的協議手續費轉至連接中的管理員錢包。需持有 AdminCap。
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" disabled={withdrawing}
            onClick={() => withFeedback(withdrawSui, setWithdrawMsg, 'SUI 手續費已提取')}>
            {withdrawing ? '提取中...' : '提取 SUI 手續費'}
          </button>
          <button className="btn btn-secondary" disabled={withdrawing}
            onClick={() => withFeedback(withdrawUsdc, setWithdrawMsg, 'USDC 手續費已提取')}>
            {withdrawing ? '提取中...' : '提取 USDC 手續費'}
          </button>
        </div>
        <ActionResult ok={withdrawMsg.ok} err={withdrawMsg.err} />
      </div>

      {/* ── 爭議仲裁 ── */}
      <div className="card">
        <h3 className="section-title">爭議仲裁</h3>

        {disputes && disputes.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>爭議中的 L/C（{disputes.length}）</h4>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>L/C ID</th><th>提出方</th><th>操作</th></tr></thead>
                <tbody>
                  {disputes.map((d, i) => (
                    <tr key={i}>
                      <td className="mono">{d.lc_id?.slice(0, 12)}…</td>
                      <td className="mono">{d.raised_by?.slice(0, 10)}…</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={() => setLcId(d.lc_id)}>選取</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '20px 0' }}>目前無爭議案件</div>
        )}

        <div className="form" style={{ marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">L/C ID（DISPUTED 狀態）</label>
            <input className="form-input" type="text" placeholder="0x..." value={lcId} onChange={e => setLcId(e.target.value)} />
          </div>
          <ActionResult ok={resolveMsg.ok} err={resolveMsg.err} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => handleResolve(true)}  disabled={resolving}>{resolving ? '處理中...' : '退款給買方'}</button>
            <button className="btn btn-danger"  onClick={() => handleResolve(false)} disabled={resolving}>{resolving ? '處理中...' : '支付給賣方'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
