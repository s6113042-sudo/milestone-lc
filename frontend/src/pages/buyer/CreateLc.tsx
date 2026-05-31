import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useCreateLc } from '../../hooks/useCreateLc';
import { CURRENCY_SUI, CURRENCY_USDC, MIST_PER_SUI } from '../../constants';
import { api } from '../../lib/api';

const MAX_HOURS = 365 * 24; // 8760

function toHours(days: string, hours: string) {
  return Number(days) * 24 + Number(hours);
}

function durationLabel(days: string, hours: string) {
  const d = Number(days);
  const h = Number(hours);
  if (d > 0 && h > 0) return `${d} 天 ${h} 小時`;
  if (d > 0) return `${d} 天`;
  return `${h} 小時`;
}

function deadlineDate(baseMs: number, offsetHours: number) {
  return new Date(baseMs + offsetHours * 3_600_000).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CreateLc() {
  const account  = useCurrentAccount();
  const navigate = useNavigate();
  const { createLc, isPending, error } = useCreateLc();

  const [seller,      setSeller]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [currency,    setCurrency]    = useState<number>(CURRENCY_SUI);
  const [termsText,   setTermsText]   = useState('');
  const [shipDays,    setShipDays]    = useState('14');
  const [shipHours,   setShipHours]   = useState('0');
  const [pickupDays,  setPickupDays]  = useState('7');
  const [pickupHours, setPickupHours] = useState('0');
  const [success,     setSuccess]     = useState('');

  const [apy, setApy] = useState<{ sui: number; usdc: number } | null>(null);
  const [hashLoading, setHashLoading] = useState(false);

  useEffect(() => {
    api.getApy().then(setApy).catch(() => null);
  }, []);

  const currentApy = apy
    ? (currency === CURRENCY_SUI ? apy.sui : apy.usdc)
    : null;

  const shipTotalHours   = toHours(shipDays, shipHours);
  const pickupTotalHours = toHours(pickupDays, pickupHours);
  const shipError   = shipTotalHours < 1 ? '最少 1 小時' : shipTotalHours > MAX_HOURS ? '最多 365 天' : '';
  const pickupError = pickupTotalHours < 1 ? '最少 1 小時' : pickupTotalHours > MAX_HOURS ? '最多 365 天' : '';
  const now = Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || shipError || pickupError) return;

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

    const shipDeadlineMs   = BigInt(now + shipTotalHours * 3_600_000);
    const pickupDeadlineMs = BigInt(now + (shipTotalHours + pickupTotalHours) * 3_600_000);
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

          {/* 出貨期限 */}
          <div className="form-group">
            <label className="form-label">出貨期限（最少 1 小時，最多 365 天）</label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <input className="form-input" type="number" min="0" max="365" placeholder="天" value={shipDays}
                  onChange={e => setShipDays(e.target.value)} />
                <span className="form-hint" style={{ marginTop: 2 }}>天</span>
              </div>
              <div style={{ flex: 1 }}>
                <input className="form-input" type="number" min="0" max="23" placeholder="小時" value={shipHours}
                  onChange={e => setShipHours(e.target.value)} />
                <span className="form-hint" style={{ marginTop: 2 }}>小時</span>
              </div>
            </div>
            {shipError
              ? <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{shipError}</span>
              : <span style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>共 {durationLabel(shipDays, shipHours)}，截止：{deadlineDate(now, shipTotalHours)}</span>
            }
          </div>

          {/* 提貨期限 */}
          <div className="form-group">
            <label className="form-label">提貨期限（出貨後起算，最少 1 小時，最多 365 天）</label>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <input className="form-input" type="number" min="0" max="365" placeholder="天" value={pickupDays}
                  onChange={e => setPickupDays(e.target.value)} />
                <span className="form-hint" style={{ marginTop: 2 }}>天</span>
              </div>
              <div style={{ flex: 1 }}>
                <input className="form-input" type="number" min="0" max="23" placeholder="小時" value={pickupHours}
                  onChange={e => setPickupHours(e.target.value)} />
                <span className="form-hint" style={{ marginTop: 2 }}>小時</span>
              </div>
            </div>
            {pickupError
              ? <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{pickupError}</span>
              : <span style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>共 {durationLabel(pickupDays, pickupHours)}，最晚提貨：{deadlineDate(now, shipTotalHours + pickupTotalHours)}</span>
            }
          </div>

          <div className="form-group">
            <label className="form-label">交易條款（用於生成 SHA-256 hash）</label>
            <textarea className="form-textarea" rows={4} placeholder="描述貨物、交付條件、違約責任等..." value={termsText} onChange={e => setTermsText(e.target.value)} />
            <span className="form-hint">條款文字將由後端計算 SHA-256 並存入鏈上</span>
          </div>

          <div className="form-info">
            <div className="info-row"><span>出貨截止：</span><span>{deadlineDate(now, shipTotalHours)}</span></div>
            <div className="info-row"><span>提貨截止：</span><span>{deadlineDate(now, shipTotalHours + pickupTotalHours)}</span></div>
            <div className="info-row"><span>收益分配：</span><span>買方 70% / 協議 30%</span></div>
          </div>

          <button type="submit" className="btn btn-primary btn-full"
            disabled={isPending || hashLoading || !!shipError || !!pickupError}>
            {hashLoading ? '計算條款 hash...' : isPending ? '提交中...' : '建立信用狀'}
          </button>
        </form>
      </div>
    </div>
  );
}
