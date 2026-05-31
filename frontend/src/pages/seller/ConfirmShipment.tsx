import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useConfirmShipment } from '../../hooks/useConfirmShipment';
import { useLcObject } from '../../hooks/useLcList';
import StatusBadge from '../../components/StatusBadge';
import { MIST_PER_SUI } from '../../constants';

export default function ConfirmShipment() {
  const { lcId } = useParams<{ lcId: string }>();
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const { confirmShipment, isPending, error } = useConfirmShipment();
  const { data: lc } = useLcObject(lcId);

  const [goodsDescription, setGoodsDescription] = useState('');
  const [shipmentRef, setShipmentRef] = useState('');
  const [success, setSuccess] = useState('');

  if (!account) {
    return (
      <div className="page-container">
        <div className="empty-state">請先連接錢包</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcId) return;

    await confirmShipment(lcId, goodsDescription, shipmentRef);
    setSuccess('出貨已確認！賣方款項即將撥付，PickupNFT 將轉移給買方。');
    setTimeout(() => navigate('/seller/payments'), 2500);
  };

  const amountDisplay = lc
    ? lc.currency === 0
      ? `${(Number(lc.amount) / Number(MIST_PER_SUI)).toFixed(4)} SUI`
      : `${(Number(lc.amount) / 1_000_000).toFixed(2)} USDC`
    : '—';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">確認出貨</h2>
          <p className="page-subtitle">L/C #{lcId?.slice(0, 12)}…</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/seller/orders')}>
          ← 返回訂單
        </button>
      </div>

      {lc && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">金額</span>
              <span className="info-value">{amountDisplay}</span>
            </div>
            <div className="info-item">
              <span className="info-label">買方</span>
              <span className="info-value mono">{lc.buyer.slice(0, 16)}…</span>
            </div>
            <div className="info-item">
              <span className="info-label">狀態</span>
              <StatusBadge status={lc.status} />
            </div>
            <div className="info-item">
              <span className="info-label">出貨截止</span>
              <span className="info-value">{new Date(Number(lc.ship_deadline_ms)).toLocaleDateString('zh-TW')}</span>
            </div>
          </div>
        </div>
      )}

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{String(error)}</div>}

      {lc?.status !== 1 && lc && (
        <div className="alert alert-error">
          此信用狀目前狀態為 <StatusBadge status={lc.status} />，無法確認出貨（需為已資金狀態）。
        </div>
      )}

      {(!lc || lc.status === 1) && (
        <div className="card">
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label className="form-label">貨物描述</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="例：機械零件 100 件，型號 XR-2000..."
                value={goodsDescription}
                onChange={e => setGoodsDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">物流追蹤單號</label>
              <input
                className="form-input"
                type="text"
                placeholder="例：SF1234567890"
                value={shipmentRef}
                onChange={e => setShipmentRef(e.target.value)}
                required
              />
            </div>

            <div className="form-info">
              <div className="info-row">
                <span>確認後將立即撥付：</span>
                <strong>{amountDisplay}</strong>
              </div>
              <div className="info-row">
                <span>買方將收到 PickupNFT 作為提貨憑證</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isPending}
            >
              {isPending ? '提交中...' : '確認出貨並請款'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
