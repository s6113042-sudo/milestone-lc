import { useCurrentAccount } from '@mysten/dapp-kit';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useNftList } from '../../hooks/useNftList';
import { useCompletePickup } from '../../hooks/useCompletePickup';
import type { PickupNFT } from '../../types';

function NftCard({ nft, onUsed }: { nft: PickupNFT; onUsed: () => void }) {
  const { completePickup, isPending } = useCompletePickup();
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    try {
      await completePickup(nft.lc_id, nft.id);
      onUsed();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className={`nft-card${nft.used ? ' used' : ''}`}>
      <div className="nft-card-header">
        <div>
          <div className="nft-badge">PickupNFT</div>
          <div className="nft-id">#{nft.id.slice(0, 12)}…</div>
        </div>
        {nft.used && <span className="badge-used">已使用</span>}
      </div>

      <div className="nft-description">{nft.goods_description}</div>

      <div className="info-grid" style={{ marginTop: 12 }}>
        <div className="info-item">
          <span className="info-label">賣方</span>
          <span className="info-value mono">{nft.seller.slice(0, 10)}…</span>
        </div>
        <div className="info-item">
          <span className="info-label">關聯 L/C</span>
          <span className="info-value mono">{nft.lc_id.slice(0, 10)}…</span>
        </div>
      </div>

      {!nft.used && (
        <div className="nft-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowQr(v => !v)}
          >
            {showQr ? '隱藏 QR 碼' : '顯示 QR 碼'}
          </button>

          {showQr && (
            <div className="qr-container">
              <QRCodeSVG
                value={JSON.stringify({ nftId: nft.id, lcId: nft.lc_id })}
                size={160}
                level="M"
              />
              <p className="qr-hint">倉庫人員掃描此 QR 碼完成驗貨</p>
            </div>
          )}

          <div className="info-item" style={{ marginTop: 12 }}>
            <span className="info-label">關聯 L/C</span>
            <span className="info-value mono">{nft.lc_id.slice(0, 14)}…</span>
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleComplete}
            disabled={isPending}
            style={{ marginTop: 12 }}
          >
            {isPending ? '確認中...' : '確認提貨完成'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function NftWallet() {
  const account = useCurrentAccount();
  const { data: nfts, isLoading, refetch } = useNftList(account?.address);

  if (!account) {
    return (
      <div className="page-container">
        <div className="empty-state">請先連接錢包</div>
      </div>
    );
  }

  const unused = nfts?.filter(n => !n.used) ?? [];
  const used = nfts?.filter(n => n.used) ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">提貨 NFT</h2>
          <p className="page-subtitle">持有 PickupNFT 即代表提貨憑證，出示 QR 碼給倉庫驗貨</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>重新整理</button>
      </div>

      {isLoading && <div className="loading">載入中...</div>}

      {!isLoading && nfts?.length === 0 && (
        <div className="empty-state">目前無提貨 NFT</div>
      )}

      {unused.length > 0 && (
        <section>
          <h3 className="section-title">待提貨（{unused.length}）</h3>
          <div className="nft-grid">
            {unused.map(nft => (
              <NftCard key={nft.id} nft={nft} onUsed={() => refetch()} />
            ))}
          </div>
        </section>
      )}

      {used.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 className="section-title">已使用（{used.length}）</h3>
          <div className="nft-grid">
            {used.map(nft => (
              <NftCard key={nft.id} nft={nft} onUsed={() => refetch()} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
