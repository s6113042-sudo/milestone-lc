import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useLcListByBuyer, useLcListBySeller } from '../hooks/useLcList';
import StatusBadge from '../components/StatusBadge';
import { CURRENCY_SUI, MIST_PER_SUI, STATUS_LABELS } from '../constants';
import type { LetterOfCredit } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

function formatAmount(lc: LetterOfCredit) {
  const raw = BigInt(lc.amount);
  return lc.currency === CURRENCY_SUI
    ? `${(Number(raw) / Number(MIST_PER_SUI)).toFixed(4)} SUI`
    : `${(Number(raw) / 1_000_000).toFixed(2)} USDC`;
}

function formatDatetime(ms: string) {
  return new Date(Number(ms)).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

interface LcRow extends LetterOfCredit {
  role: '買方' | '賣方' | '買方 / 賣方';
}

function mergeAndTag(
  buyerLcs: LetterOfCredit[],
  sellerLcs: LetterOfCredit[],
): LcRow[] {
  const map = new Map<string, LcRow>();
  for (const lc of buyerLcs) map.set(lc.id, { ...lc, role: '買方' });
  for (const lc of sellerLcs) {
    if (map.has(lc.id)) map.get(lc.id)!.role = '買方 / 賣方';
    else map.set(lc.id, { ...lc, role: '賣方' });
  }
  return [...map.values()].sort(
    (a, b) => Number(b.ship_deadline_ms) - Number(a.ship_deadline_ms),
  );
}

const ROLE_COLORS: Record<string, string> = {
  '買方': '#2563eb',
  '賣方': '#16a34a',
  '買方 / 賣方': '#7c3aed',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, color: '#fff',
      background: ROLE_COLORS[role] ?? '#6b7280', whiteSpace: 'nowrap',
    }}>
      {role}
    </span>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="複製"
      style={{
        marginLeft: 8, padding: '2px 10px', fontSize: 11, cursor: 'pointer',
        borderRadius: 4, border: '1px solid var(--border)',
        background: copied ? 'var(--success)' : 'var(--bg)',
        color: copied ? '#fff' : 'var(--text-h)',
        transition: 'background .15s, color .15s',
        verticalAlign: 'middle',
        flexShrink: 0,
        fontWeight: 600,
      }}
    >
      {copied ? '已複製' : '複製'}
    </button>
  );
}

// ── Detail field row ───────────────────────────────────────────────────────

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        width: 120, flexShrink: 0, fontSize: 12, fontWeight: 600,
        color: 'var(--text)', paddingTop: 1,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      <span style={{
        flex: 1, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13,
        wordBreak: 'break-all', lineHeight: 1.6, color: 'var(--text-h)',
        display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4,
      }}>
        <span>{value}</span>
        {copyable && value && value !== '—' && <CopyBtn text={value} />}
      </span>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({ lc, onClose }: { lc: LcRow; onClose: () => void }) {
  const termsHex = lc.terms_hash.map(b => b.toString(16).padStart(2, '0')).join('');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12, width: '100%', maxWidth: 620,
          maxHeight: '90vh', overflowY: 'auto', padding: 28,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-h)' }}>
              信用狀詳情
            </h3>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <RoleBadge role={lc.role} />
              <StatusBadge status={lc.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid var(--border)', background: 'var(--bg)',
              fontSize: 18, cursor: 'pointer', color: 'var(--text-h)',
              lineHeight: 1, padding: '4px 10px', borderRadius: 6,
              fontWeight: 400,
            }}
          >
            ×
          </button>
        </div>

        {/* fields */}
        <DetailRow label="L/C ID"          value={lc.id}          copyable />
        <DetailRow label="金額"             value={formatAmount(lc)} />
        <DetailRow label="買方地址"         value={lc.buyer}       copyable />
        <DetailRow label="賣方地址"         value={lc.seller}      copyable />
        {lc.recovery_address && (
          <DetailRow label="備援地址"       value={lc.recovery_address} copyable />
        )}
        <DetailRow label="出貨截止"         value={formatDatetime(lc.ship_deadline_ms)} />
        <DetailRow label="提貨截止"         value={formatDatetime(lc.pickup_deadline_ms)} />
        <DetailRow label="物流單號"         value={lc.shipment_ref ?? '—'} copyable={!!lc.shipment_ref} />
        <DetailRow label="條款 Hash (hex)"  value={termsHex}       copyable />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────

function LcTable({ rows, empty, onSelect }: { rows: LcRow[]; empty: string; onSelect: (lc: LcRow) => void }) {
  if (rows.length === 0) return <div className="empty-state" style={{ padding: '16px 0' }}>{empty}</div>;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>L/C ID</th>
            <th>角色</th>
            <th>金額</th>
            <th>對手方</th>
            <th>出貨截止</th>
            <th>提貨截止</th>
            <th>物流單號</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(lc => {
            const counterparty = lc.role === '買方' ? lc.seller : lc.buyer;
            return (
              <tr
                key={lc.id}
                onClick={() => onSelect(lc)}
                style={{ cursor: 'pointer' }}
                title="點擊查看詳細資料"
              >
                <td className="mono">{lc.id.slice(0, 10)}…</td>
                <td><RoleBadge role={lc.role} /></td>
                <td><strong>{formatAmount(lc)}</strong></td>
                <td className="mono">{counterparty.slice(0, 10)}…</td>
                <td>{formatDatetime(lc.ship_deadline_ms)}</td>
                <td>{formatDatetime(lc.pickup_deadline_ms)}</td>
                <td style={{ fontWeight: lc.shipment_ref ? 600 : 400 }}>
                  {lc.shipment_ref ?? '—'}
                </td>
                <td><StatusBadge status={lc.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function History() {
  const account = useCurrentAccount();
  const { data: buyerLcs,  isLoading: lb, refetch: rb } = useLcListByBuyer(account?.address);
  const { data: sellerLcs, isLoading: ls, refetch: rs } = useLcListBySeller(account?.address);
  const [selected, setSelected] = useState<LcRow | null>(null);

  if (!account) {
    return <div className="page-container"><div className="empty-state">請先連接錢包</div></div>;
  }

  const loading = lb || ls;
  const all     = mergeAndTag(buyerLcs ?? [], sellerLcs ?? []);
  const active  = all.filter(lc => lc.status <= 2);
  const archived = all.filter(lc => lc.status > 2);

  return (
    <div className="page-container">
      {selected && <DetailModal lc={selected} onClose={() => setSelected(null)} />}

      <div className="page-header">
        <div>
          <h2 className="page-title">交易紀錄</h2>
          <p className="page-subtitle">所有與此帳戶相關的信用狀（買方 + 賣方），點擊列查看詳情</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { rb(); rs(); }}>重新整理</button>
      </div>

      {loading && <div className="loading">載入中...</div>}

      {!loading && all.length === 0 && (
        <div className="empty-state">尚無任何交易紀錄</div>
      )}

      {!loading && active.length > 0 && (
        <section>
          <h3 className="section-title" style={{ marginBottom: 12 }}>進行中（{active.length}）</h3>
          <LcTable rows={active} empty="無進行中的信用狀" onSelect={setSelected} />
        </section>
      )}

      {!loading && archived.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>歷史記錄（{archived.length}）</h3>
          <LcTable rows={archived} empty="無歷史記錄" onSelect={setSelected} />
        </section>
      )}
    </div>
  );
}
