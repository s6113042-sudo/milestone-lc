import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import { useLcListByBuyer } from '../../hooks/useLcList';
import { useFundLc } from '../../hooks/useFundLc';
import { useBuyerReclaim } from '../../hooks/useBuyerReclaim';
import { useRaiseDispute } from '../../hooks/useRaiseDispute';
import { useSetRecoveryAddress } from '../../hooks/useSetRecoveryAddress';
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

// ── 備援地址 Modal ──────────────────────────────────────────────────────────

function RecoveryModal({ lc, onClose, onDone }: { lc: LetterOfCredit; onClose: () => void; onDone: () => void }) {
  const [addr, setAddr] = useState(lc.recovery_address ?? '');
  const { setRecoveryAddress, isPending, error } = useSetRecoveryAddress();
  const [ok, setOk] = useState(false);

  const handleSave = async () => {
    await setRecoveryAddress(lc.id, addr.trim());
    setOk(true);
    setTimeout(() => { onDone(); onClose(); }, 1500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 420, maxWidth: '92vw' }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>設定備援地址</h3>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
          PickupNFT 將轉移到此地址（而非買方錢包），適用於錢包遺失備援。
        </p>

        {ok && <div className="alert alert-success" style={{ marginBottom: 12 }}>已設定！</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">備援地址</label>
          <input className="form-input" placeholder="0x..." value={addr} onChange={e => setAddr(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={isPending || !addr.trim()}>
            {isPending ? '儲存中...' : '儲存'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

// ── 爭議 Modal ─────────────────────────────────────────────────────────────

function DisputeModal({ lc, onClose, onDone }: { lc: LetterOfCredit; onClose: () => void; onDone: () => void }) {
  const [evidence, setEvidence] = useState('');
  const { raiseDispute, isPending, error } = useRaiseDispute();
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

        {ok && <div className="alert alert-success" style={{ marginBottom: 12 }}>爭議已提出，等待管理員仲裁。</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">爭議說明（將 hash 後存入鏈上）</label>
          <textarea className="form-textarea" rows={4} placeholder="說明爭議原因、貨物問題或違約情形..." value={evidence} onChange={e => setEvidence(e.target.value)} />
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

// ── L/C Card ───────────────────────────────────────────────────────────────

function LcCard({ lc, onRefetch }: { lc: LetterOfCredit; onRefetch: () => void }) {
  const { fund, isPending: fundPending } = useFundLc();
  const { buyerReclaim, isPending: reclaimPending } = useBuyerReclaim();
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const canFund    = lc.status === 0;
  const canReclaim = lc.status === 1 && Date.now() > Number(lc.ship_deadline_ms);
  const canDispute = lc.status === 2;
  const canSetRecovery = lc.status <= 1;

  return (
    <>
      {showRecovery && <RecoveryModal lc={lc} onClose={() => setShowRecovery(false)} onDone={onRefetch} />}
      {showDispute  && <DisputeModal  lc={lc} onClose={() => setShowDispute(false)}  onDone={onRefetch} />}

      <div className="lc-card">
        <div className="lc-card-header">
          <div>
            <div className="lc-id">#{lc.id.slice(0, 12)}…</div>
            <div className="lc-amount">{formatAmount(lc)}</div>
          </div>
          <StatusBadge status={lc.status} />
        </div>

        <div className="lc-card-body">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">賣方</span>
              <span className="info-value mono">{lc.seller.slice(0, 12)}…</span>
            </div>
            <div className="info-item">
              <span className="info-label">出貨截止</span>
              <span className="info-value">{formatDate(lc.ship_deadline_ms)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">提貨截止</span>
              <span className="info-value">{formatDate(lc.pickup_deadline_ms)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">備援地址</span>
              <span className="info-value mono">
                {lc.recovery_address ? `${lc.recovery_address.slice(0, 10)}…` : '未設定'}
              </span>
            </div>
            {lc.shipment_ref && (
              <div className="info-item">
                <span className="info-label">物流單號</span>
                <span className="info-value">{lc.shipment_ref}</span>
              </div>
            )}
          </div>
        </div>

        <div className="lc-card-actions">
          {canFund && (
            <button className="btn btn-primary btn-sm" disabled={fundPending}
              onClick={() => fund(lc.id, lc.currency, BigInt(lc.amount)).then(onRefetch)}>
              {fundPending ? '存入中...' : '存入資金'}
            </button>
          )}
          {canSetRecovery && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRecovery(true)}>
              {lc.recovery_address ? '更新備援地址' : '設定備援地址'}
            </button>
          )}
          {canReclaim && (
            <button className="btn btn-danger btn-sm" disabled={reclaimPending}
              onClick={() => buyerReclaim(lc.id).then(onRefetch)}>
              {reclaimPending ? '取回中...' : '取回資金（賣方違約）'}
            </button>
          )}
          {lc.status === 2 && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/pickup?nft=&lc=${lc.id}`)}>
              驗貨提貨
            </button>
          )}
          {canDispute && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDispute(true)}>
              提出爭議
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── 主頁面 ─────────────────────────────────────────────────────────────────

export default function LcList() {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const { data: lcs, isLoading, refetch } = useLcListByBuyer(account?.address);

  if (!account) return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;

  const active   = lcs?.filter(lc => lc.status <= 2) ?? [];
  const archived = lcs?.filter(lc => lc.status > 2)  ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">我的信用狀</h2>
          <p className="page-subtitle">作為買方建立的所有 L/C</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/buyer/create')}>+ 建立信用狀</button>
      </div>

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && !lcs?.length && (
        <div className="empty-state">
          <p>尚無信用狀</p>
          <button className="btn btn-primary" onClick={() => navigate('/buyer/create')}>建立第一張信用狀</button>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="section-title">進行中（{active.length}）</h3>
          <div className="lc-grid">
            {active.map(lc => <LcCard key={lc.id} lc={lc} onRefetch={() => refetch()} />)}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 className="section-title">歷史記錄（{archived.length}）</h3>
          <div className="lc-grid">
            {archived.map(lc => <LcCard key={lc.id} lc={lc} onRefetch={() => refetch()} />)}
          </div>
        </section>
      )}
    </div>
  );
}
