import { useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { useTreasury } from '../../hooks/useTreasury';
import { useAdminResolve } from '../../hooks/useAdminResolve';
import { LC_CORE, MIST_PER_SUI } from '../../constants';

function formatSui(mist: string) {
  return `${(Number(mist) / Number(MIST_PER_SUI)).toFixed(4)} SUI`;
}

function formatUsdc(raw: string) {
  return `${(Number(raw) / 1_000_000).toFixed(2)} USDC`;
}

function HealthBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.round(value * 100));
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

export default function AdminDashboard() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { data: treasury, isLoading: tLoading, refetch: refetchTreasury } = useTreasury();
  const { adminResolve, isPending: resolving } = useAdminResolve();

  const [lcId, setLcId] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState('');

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

  const suiHealth = treasury
    ? Number(treasury.sui_buffer) / Math.max(1, Number(treasury.pending_sui))
    : 0;
  const usdcHealth = treasury
    ? Number(treasury.usdc_buffer) / Math.max(1, Number(treasury.pending_usdc))
    : 0;

  const handleResolve = async (pay_to_buyer: boolean) => {
    setResolveError('');
    setResolveSuccess('');
    if (!lcId.trim()) { setResolveError('請輸入 L/C ID'); return; }
    try {
      await adminResolve(lcId.trim(), pay_to_buyer);
      setResolveSuccess(`已裁決：支付給${pay_to_buyer ? '買方' : '賣方'}`);
      refetchTreasury();
    } catch (e) {
      setResolveError(String(e));
    }
  };

  if (!account) {
    return (
      <div className="page-container">
        <div className="empty-state">請先連接錢包</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">協議管理</h2>
          <p className="page-subtitle">金庫健康度、收益面板、仲裁操作</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetchTreasury()}>重新整理</button>
      </div>

      {tLoading && <div className="loading">載入金庫資料...</div>}

      {treasury && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="card">
            <h3 className="section-title">SUI 金庫</h3>
            <HealthBar value={suiHealth} label="備付率（Buffer / Pending）" />
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">可用緩衝</span>
                <span className="info-value">{formatSui(treasury.sui_buffer)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">haSUI 持倉</span>
                <span className="info-value">{treasury.hasui_held} haSUI</span>
              </div>
              <div className="info-item">
                <span className="info-label">待贖回</span>
                <span className="info-value">{formatSui(treasury.pending_sui)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">協議手續費</span>
                <span className="info-value">{formatSui(treasury.protocol_fee_sui)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">USDC 金庫</h3>
            <HealthBar value={usdcHealth} label="備付率（Buffer / Pending）" />
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">可用緩衝</span>
                <span className="info-value">{formatUsdc(treasury.usdc_buffer)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">sCoin 持倉</span>
                <span className="info-value">{treasury.scoin_held} sCoin</span>
              </div>
              <div className="info-item">
                <span className="info-label">待贖回</span>
                <span className="info-value">{formatUsdc(treasury.pending_usdc)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">協議手續費</span>
                <span className="info-value">{formatUsdc(treasury.protocol_fee_usdc)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">爭議仲裁</h3>

        {disputes && disputes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
              爭議中的 L/C（{disputes.length}）
            </h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>L/C ID</th>
                    <th>提出方</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d, i) => (
                    <tr key={i}>
                      <td className="mono">{d.lc_id?.slice(0, 12)}…</td>
                      <td className="mono">{d.raised_by?.slice(0, 10)}…</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setLcId(d.lc_id)}
                        >
                          選取
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(!disputes || disputes.length === 0) && (
          <div className="empty-state" style={{ padding: '20px 0' }}>目前無爭議案件</div>
        )}

        <div className="form" style={{ marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">L/C ID（爭議狀態）</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x..."
              value={lcId}
              onChange={e => setLcId(e.target.value)}
            />
          </div>

          {resolveSuccess && <div className="alert alert-success">{resolveSuccess}</div>}
          {resolveError && <div className="alert alert-error">{resolveError}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => handleResolve(true)}
              disabled={resolving}
            >
              {resolving ? '處理中...' : '退款給買方'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleResolve(false)}
              disabled={resolving}
            >
              {resolving ? '處理中...' : '支付給賣方'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
