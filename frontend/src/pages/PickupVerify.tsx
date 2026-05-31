import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCompletePickup } from '../hooks/useCompletePickup';
import { useLcObject } from '../hooks/useLcList';
import StatusBadge from '../components/StatusBadge';

export default function PickupVerify() {
  const account = useCurrentAccount();
  const [searchParams] = useSearchParams();
  const { completePickup, isPending, error } = useCompletePickup();

  const [nftId, setNftId] = useState(searchParams.get('nft') ?? '');
  const [lcId, setLcId] = useState(searchParams.get('lc') ?? '');
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  const { data: lc } = useLcObject(lcId || undefined);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!nftId.trim() || !lcId.trim()) {
      setLocalError('請填入 NFT ID 和 L/C ID');
      return;
    }
    try {
      await completePickup(lcId.trim(), nftId.trim());
      setSuccess('驗貨完成！L/C 狀態已更新為「已完成」。');
    } catch (e) {
      setLocalError(String(e));
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
          <h2 className="page-title">提貨驗證</h2>
          <p className="page-subtitle">掃描買方 QR 碼或手動輸入 NFT ID 完成驗貨</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {(error || localError) && (
        <div className="alert alert-error">{localError || String(error)}</div>
      )}

      <div className="card">
        <form onSubmit={handleVerify} className="form">
          <div className="form-group">
            <label className="form-label">PickupNFT ID</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x..."
              value={nftId}
              onChange={e => setNftId(e.target.value)}
              required
            />
            <span className="form-hint">從買方 QR 碼解析，或手動輸入</span>
          </div>

          <div className="form-group">
            <label className="form-label">關聯 L/C ID</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x..."
              value={lcId}
              onChange={e => setLcId(e.target.value)}
              required
            />
          </div>

          {lc && (
            <div className="form-info">
              <div className="info-row">
                <span>L/C 狀態：</span>
                <StatusBadge status={lc.status} />
              </div>
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
            disabled={isPending}
          >
            {isPending ? '驗證中...' : '完成驗貨'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>QR 碼解析</h3>
        <p style={{ color: 'var(--text)', fontSize: 14 }}>
          買方 QR 碼包含 JSON 格式：<code>{"{ \"nftId\": \"0x...\", \"lcId\": \"0x...\" }"}</code>
        </p>
        <p style={{ color: 'var(--text)', fontSize: 14, marginTop: 8 }}>
          掃描後請將對應欄位填入上方表單。
        </p>
      </div>
    </div>
  );
}
