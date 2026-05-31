import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCreateLc } from '../../hooks/useCreateLc';
import { CURRENCY_SUI, CURRENCY_USDC, MIST_PER_SUI } from '../../constants';

export default function CreateLc() {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const { createLc, isPending, error } = useCreateLc();

  const [seller, setSeller] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<number>(CURRENCY_SUI);
  const [termsText, setTermsText] = useState('');
  const [shipDays, setShipDays] = useState('14');
  const [pickupDays, setPickupDays] = useState('7');
  const [success, setSuccess] = useState('');

  const encodeTermsHash = (text: string): number[] => {
    const encoded = new TextEncoder().encode(text);
    return Array.from(encoded.slice(0, 32)).concat(
      Array(Math.max(0, 32 - encoded.length)).fill(0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const now = Date.now();
    const shipDeadlineMs = BigInt(now + Number(shipDays) * 86400_000);
    const pickupDeadlineMs = BigInt(now + (Number(shipDays) + Number(pickupDays)) * 86400_000);

    const amountMist = currency === CURRENCY_SUI
      ? BigInt(Math.round(parseFloat(amount) * Number(MIST_PER_SUI)))
      : BigInt(Math.round(parseFloat(amount) * 1_000_000));

    await createLc({
      seller,
      amountMist,
      currency,
      termsHash: encodeTermsHash(termsText),
      shipDeadlineMs,
      pickupDeadlineMs,
    });

    setSuccess('信用狀已建立，等待鏈上確認。');
    setTimeout(() => navigate('/buyer/lcs'), 2000);
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
        <h2 className="page-title">建立信用狀</h2>
        <p className="page-subtitle">資金將存入協議金庫並自動生息（SUI → haSUI / USDC → sUSDC）</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{String(error)}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label">幣種</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn${currency === CURRENCY_SUI ? ' active' : ''}`}
                onClick={() => setCurrency(CURRENCY_SUI)}
              >
                SUI
              </button>
              <button
                type="button"
                className={`toggle-btn${currency === CURRENCY_USDC ? ' active' : ''}`}
                onClick={() => setCurrency(CURRENCY_USDC)}
              >
                USDC
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">賣方地址</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x..."
              value={seller}
              onChange={e => setSeller(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">金額（{currency === CURRENCY_SUI ? 'SUI' : 'USDC'}）</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.001"
              placeholder="例：100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">出貨期限（天）</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={shipDays}
                onChange={e => setShipDays(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">提貨期限（天，出貨後起算）</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={pickupDays}
                onChange={e => setPickupDays(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">交易條款（用於 hash）</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="描述貨物、交付條件等..."
              value={termsText}
              onChange={e => setTermsText(e.target.value)}
            />
          </div>

          <div className="form-info">
            <div className="info-row">
              <span>出貨截止：</span>
              <span>{new Date(Date.now() + Number(shipDays) * 86400_000).toLocaleDateString('zh-TW')}</span>
            </div>
            <div className="info-row">
              <span>提貨截止：</span>
              <span>{new Date(Date.now() + (Number(shipDays) + Number(pickupDays)) * 86400_000).toLocaleDateString('zh-TW')}</span>
            </div>
            <div className="info-row">
              <span>收益分配：</span>
              <span>70% 買方 / 30% 協議</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isPending}>
            {isPending ? '提交中...' : '建立信用狀'}
          </button>
        </form>
      </div>
    </div>
  );
}
