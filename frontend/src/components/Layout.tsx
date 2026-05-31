import { ConnectButton, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NavLink } from 'react-router-dom';
import heroImg from '../assets/hero.png';

const NAV_ITEMS = [
  { label: '買方', path: '/buyer/lcs',      icon: '🛒' },
  { label: '賣方', path: '/seller/orders',  icon: '📦' },
  { label: '倉庫驗貨', path: '/pickup',     icon: '✅' },
  { label: '交易紀錄', path: '/history',    icon: '📋' },
  { label: '管理員', path: '/admin',        icon: '⚙️' },
];

function SuiBalance({ address }: { address: string }) {
  const { data } = useSuiClientQuery('getBalance', {
    owner: address,
    coinType: '0x2::sui::SUI',
  });
  const sui = data ? (Number(data.totalBalance) / 1e9).toFixed(2) : '…';
  return <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{sui} SUI</span>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── 側邊欄 ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          gap: 8,
        }}>
          <img src={heroImg} alt="里程碑 L/C" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '0.02em' }}>里程碑 L/C</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8 }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text)',
        }}>
          Sui Devnet
        </div>
      </aside>

      {/* ── 右側主區域 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 12, padding: '0 24px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {account && <SuiBalance address={account.address} />}
          <ConnectButton />
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, padding: 24,
          maxWidth: 1100, width: '100%',
          margin: '0 auto',
          alignSelf: 'stretch',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
