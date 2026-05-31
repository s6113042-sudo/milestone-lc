import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCompletePickup } from '../hooks/useCompletePickup';
import { useLcObject } from '../hooks/useLcList';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function PickupVerify() {
  const account        = useCurrentAccount();
  const [searchParams] = useSearchParams();
  const { completePickup, isPending, error } = useCompletePickup();

  const [nftId,      setNftId]      = useState(searchParams.get('nft') ?? '');
  const [lcId,       setLcId]       = useState(searchParams.get('lc')  ?? '');
  const [success,    setSuccess]    = useState('');
  const [localError, setLocalError] = useState('');

  // 後端預先驗證 NFT 狀態（顯示用，不阻擋操作）
  const [nftInfo, setNftInfo] = useState<{
    valid: boolean; used: boolean; lc_id: string; goods_description: string;
  } | null>(null);
  const [nftChecking, setNftChecking] = useState(false);

  const { data: lc } = useLcObject(lcId || undefined);

  const checkNft = async () => {
    if (!nftId.trim()) return;
    setNftChecking(true);
    try {
      const result = await api.verifyNft(nftId.trim());
      setNftInfo(result);
      // 若後端回傳 lc_id，自動填入
      if (result.lc_id && !lcId) setLcId(result.lc_id);
    } catch {
      setNftInfo(null);
    } finally {
      setNftChecking(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const nft = nftId.trim();
    const lc  = lcId.trim();
    if (!nft || !lc) {
      setLocalError('請填入 NFT ID 和 L/C ID');
      return;
    }
    if (nft === lc) {
      setLocalError('NFT ID 和 L/C ID 不能相同，兩者是不同的鏈上物件');
      return;
    }
    try {
      await completePickup(lc, nft);
      setSuccess('驗貨完成！L/C 狀態已更新為「已完成」。');
    } catch (e) {
      setLocalError(String(e));
    }
  };

  if (!account) {
    return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">提貨驗證</h2>
          <p className="page-subtitle">輸入 NFT ID 或掃描買方 QR 碼完成驗貨</p>
        </div>
      </div>

      {success    && <div className="alert alert-success">{success}</div>}
      {(localError || error) && (
        <div className="alert alert-error">{localError || String(error)}</div>
      )}

      <div className="card">
        <form onSubmit={handleVerify} className="form">
          {/* NFT ID + 即時驗證 */}
          <div className="form-group">
            <label className="form-label">PickupNFT ID</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="0x..."
                value={nftId}
                onChange={e => { setNftId(e.target.value); setNftInfo(null); }}
                required
              />
              <button type="button" className="btn btn-secondary" onClick={checkNft} disabled={nftChecking || !nftId.trim()}>
                {nftChecking ? '查詢中...' : '查詢'}
              </button>
            </div>
            <span className="form-hint">從買方 QR 碼取得，或手動輸入</span>
          </div>

          {/* 後端回傳的 NFT 資訊 */}
          {nftInfo && (
            <div className={`form-info${nftInfo.used ? '' : ''}`} style={{
              background: nftInfo.used ? 'var(--danger-light)' : 'var(--success-light)',
              border: `1px solid ${nftInfo.used ? 'var(--danger)' : 'var(--success)'}`,
            }}>
              <div className="info-row">
                <span>NFT 狀態：</span>
                <strong style={{ color: nftInfo.used ? 'var(--danger)' : 'var(--success)' }}>
                  {nftInfo.used ? '已使用（無效）' : '有效，可驗貨'}
                </strong>
              </div>
              <div className="info-row">
                <span>貨物描述：</span>
                <span>{nftInfo.goods_description}</span>
              </div>
              {nftInfo.lc_id && (
                <div className="info-row">
                  <span>關聯 L/C：</span>
                  <span className="mono">{nftInfo.lc_id.slice(0, 16)}…</span>
                </div>
              )}
            </div>
          )}

          {/* L/C ID（可由後端自動填入）*/}
          <div className="form-group">
            <label className="form-label">關聯 L/C ID</label>
            <input
              className="form-input"
              placeholder="0x...（查詢 NFT 後自動填入）"
              value={lcId}
              onChange={e => setLcId(e.target.value)}
              required
            />
          </div>

          {/* L/C 鏈上狀態 */}
          {lc && (
            <div className="form-info" style={lc.status !== 2 ? {
              background: 'var(--danger-light)', border: '1px solid var(--danger)',
            } : {}}>
              <div className="info-row">
                <span>L/C 狀態：</span>
                <StatusBadge status={lc.status} />
              </div>
              {lc.status !== 2 && (
                <div className="info-row">
                  <span style={{ color: 'var(--danger)', fontSize: 13 }}>
                    ⚠ L/C 必須是「已出貨」狀態才能完成驗貨（目前狀態不符）
                  </span>
                </div>
              )}
              <div className="info-row">
                <span>買方：</span>
                <span className="mono">{lc.buyer.slice(0, 16)}…</span>
              </div>
              {lc.shipment_ref && (
                <div className="info-row">
                  <span>物流單號：</span>
                  <span>{lc.shipment_ref}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isPending || (nftInfo?.used ?? false) || (lc !== undefined && lc !== null && lc.status !== 2)}
          >
            {isPending ? '驗證中...' : '完成驗貨'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="section-title" style={{ marginBottom: 8 }}>QR 碼格式</h3>
        <p style={{ fontSize: 13, color: 'var(--text)' }}>
          買方 QR 碼包含 JSON：<code>{`{ "nftId": "0x...", "lcId": "0x..." }`}</code>
        </p>
        <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
          掃描後將 <code>nftId</code> 貼入上方欄位，點「查詢」可自動帶入 lcId。
        </p>
      </div>
    </div>
  );
}
