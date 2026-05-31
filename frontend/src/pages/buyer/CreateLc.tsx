import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCreateLc } from '../../hooks/useCreateLc';
import { CURRENCY_SUI, CURRENCY_USDC, MIST_PER_SUI } from '../../constants';
import { api } from '../../lib/api';

export default function CreateLc() {
  const account  = useCurrentAccount();
  const navigate = useNavigate();
  const { createLc, isPending, error } = useCreateLc();

  const [seller,    setSeller]    = useState('');
  const [amount,    setAmount]    = useState('');
  const [currency,  setCurrency]  = useState<number>(CURRENCY_SUI);
  const [termsText, setTermsText] = useState('');
  const [shipDays,  setShipDays]  = useState('14');
  const [pickupDays,setPickupDays]= useState('7');
  const [success,   setSuccess]   = useState('');

  const [apy, setApy] = useState<{ sui: number; usdc: number } | null>(null);
  const [hashLoading, setHashLoading] = useState(false);

  useEffect(() => {
    api.getApy().then(setApy).catch(() => null);
  }, []);

  const currentApy = apy
    ? (currency === CURRENCY_SUI ? apy.sui : apy.usdc)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    // 取得 terms_hash：若後端可用則用後端 SHA-256，否則 fallback 到前端截斷
    let termsHash: number[];
    try {
      setHashLoading(true);
      const { bytes } = await api.hashTerms(termsText || ' ');
      termsHash = bytes;
    } catch {
      const enc = new TextEncoder().encode(termsText);
      termsHash = Array.from(enc.slice(0, 32)).concat(
        Array(Math.max(0, 32 - enc.length)).fill(0)
      );
    } finally {
      setHashLoading(false);
    }

    const now = Date.now();
    const shipDeadlineMs   = BigInt(now + Number(shipDays) * 86400_000);
    const pickupDeadlineMs = BigInt(now + (Number(shipDays) + Number(pickupDays)) * 86400_000);
    const amountMist = currency === CURRENCY_SUI
      ? BigInt(Math.round(parseFloat(amount) * Number(MIST_PER_SUI)))
      : BigInt(Math.round(parseFloat(amount) * 1_000_000));

    await createLc({ seller, amountMist, currency, termsHash, shipDeadlineMs, pickupDeadlineMs });
    setSuccess('信用狀已建立，等待鏈上確認。');
    setTimeout(() => navigate('/buyer/lcs'), 2000);
  };

  if (!account) return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">建立信用狀</h2>
          <p className="page-subtitle">資金存入後自動生息（SUI → haSUI / USDC → sUSDC）</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-error">{String(error)}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          {/* 幣種切換 */}
          <div className="form-group">
            <label className="form-label">幣種</label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn${currency === CURRENCY_SUI  ? ' active' : ''}`} onClick={() => setCurrency(CURRENCY_SUI)}>SUI</button>
              <button type="button" className={`toggle-btn${currency === CURRENCY_USDC ? ' active' : ''}`} onClick={() => setCurrency(CURRENCY_USDC)}>USDC</button>
            </div>
            {currentApy !== null && (
              <span style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                目前年化收益率（APY）：{(currentApy * 100).toFixed(2)}%（買方分得 70%）
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">賣方地址</label>
            <input className="form-input" type="text" placeholder="0x..." value={seller} onChange={e => setSeller(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">金額（{currency === CURRENCY_SUI ? 'SUI' : 'USDC'}）</label>
            <input className="form-input" type="number" min="0" step="0.001" placeholder="例：100" value={amount} onChange={e => setAmount(e.target.value)} required />
            {currentApy !== null && amount && !isNaN(parseFloat(amount)) && (
              <span style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
                預估 30 天買方收益：≈ {(parseFloat(amount) * currentApy * 0.7 * (30 / 365)).toFixed(4)} {currency === CURRENCY_SUI ? 'SUI' : 'USDC'}
              </span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">出貨期限（天）</label>
              <input className="form-input" type="number" min="1" value={shipDays} onChange={e => setShipDays(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">提貨期限（天，出貨後起算）</label>
              <input className="form-input" type="number" min="1" value={pickupDays} onChange={e => setPickupDays(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">交易條款（用於生成 SHA-256 hash）</label>
            <textarea className="form-textarea" rows={4} placeholder="描述貨物、交付條件、違約責任等..." value={termsText} onChange={e => setTermsText(e.target.value)} />
            <span className="form-hint">條款文字將由後端計算 SHA-256 並存入鏈上</span>
          </div>

          <div className="form-info">
            <div className="info-row"><span>出貨截止：</span><span>{new Date(Date.now() + Number(shipDays) * 86400_000).toLocaleDateString('zh-TW')}</span></div>
            <div className="info-row"><span>提貨截止：</span><span>{new Date(Date.now() + (Number(shipDays) + Number(pickupDays)) * 86400_000).toLocaleDateString('zh-TW')}</span></div>
            <div className="info-row"><span>收益分配：</span><span>買方 70% / 協議 30%</span></div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isPending || hashLoading}>
            {hashLoading ? '計算條款 hash...' : isPending ? '提交中...' : '建立信用狀'}
          </button>
        </form>
      </div>
    </div>
  );
}
