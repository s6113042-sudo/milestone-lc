import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import { useLcListByBuyer } from '../../hooks/useLcList';
import { useFundLc } from '../../hooks/useFundLc';
import { useBuyerReclaim } from '../../hooks/useBuyerReclaim';
import StatusBadge from '../../components/StatusBadge';
import { CURRENCY_SUI, MIST_PER_SUI } from '../../constants';
import type { LetterOfCredit } from '../../types';

function formatAmount(lc: LetterOfCredit) {
  const raw = BigInt(lc.amount);
  if (lc.currency === CURRENCY_SUI) {
    return `${(Number(raw) / Number(MIST_PER_SUI)).toFixed(4)} SUI`;
  }
  return `${(Number(raw) / 1_000_000).toFixed(2)} USDC`;
}

function formatDate(ms: string) {
  return new Date(Number(ms)).toLocaleDateString('zh-TW');
}

function LcCard({ lc, onRefund }: { lc: LetterOfCredit; onRefund: () => void }) {
  const { fund, isPending: fundPending } = useFundLc();
  const { buyerReclaim, isPending: reclaimPending } = useBuyerReclaim();
  const navigate = useNavigate();

  const canFund = lc.status === 0;
  const canReclaim = lc.status === 1 && Date.now() > Number(lc.ship_deadline_ms);

  const handleFund = async () => {
    await fund(lc.id, lc.currency, BigInt(lc.amount));
    onRefund();
  };

  const handleReclaim = async () => {
    await buyerReclaim(lc.id);
    onRefund();
  };

  return (
    <div className="lc-card">
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
            <span className="info-label">賣方</span>
            <span className="info-value mono">{lc.seller.slice(0, 10)}…</span>
          </div>
          <div className="info-item">
            <span className="info-label">出貨截止</span>
            <span className="info-value">{formatDate(lc.ship_deadline_ms)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">提貨截止</span>
            <span className="info-value">{formatDate(lc.pickup_deadline_ms)}</span>
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
          <button
            className="btn btn-primary btn-sm"
            onClick={handleFund}
            disabled={fundPending}
          >
            {fundPending ? '資金存入中...' : '存入資金'}
          </button>
        )}
        {canReclaim && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleReclaim}
            disabled={reclaimPending}
          >
            {reclaimPending ? '取回中...' : '取回資金（賣方違約）'}
          </button>
        )}
        {lc.status === 2 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/pickup?nft=&lc=${lc.id}`)}
          >
            驗貨提貨
          </button>
        )}
      </div>
    </div>
  );
}

export default function LcList() {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const { data: lcs, isLoading, refetch } = useLcListByBuyer(account?.address);

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
          <h2 className="page-title">我的信用狀</h2>
          <p className="page-subtitle">作為買方建立的所有 L/C</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/buyer/create')}>
          + 建立信用狀
        </button>
      </div>

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && (!lcs || lcs.length === 0) && (
        <div className="empty-state">
          <p>尚無信用狀</p>
          <button className="btn btn-primary" onClick={() => navigate('/buyer/create')}>
            建立第一張信用狀
          </button>
        </div>
      )}

      <div className="lc-grid">
        {lcs?.map(lc => (
          <LcCard key={lc.id} lc={lc} onRefund={() => refetch()} />
        ))}
      </div>
    </div>
  );
}
