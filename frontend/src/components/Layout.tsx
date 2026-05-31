import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ROLES = [
  { label: '買方', path: '/buyer/lcs' },
  { label: '賣方', path: '/seller/orders' },
  { label: '倉庫驗貨', path: '/pickup' },
  { label: '管理員', path: '/admin' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand" onClick={() => navigate('/buyer/lcs')} style={{ cursor: 'pointer' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <rect width="28" height="28" rx="6" fill="#7c3aed" />
            <path d="M7 10h14M7 14h10M7 18h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="brand-name">里程碑 L/C</span>
        </div>

        <nav className="header-nav">
          {NAV_ROLES.map(r => (
            <NavLink
              key={r.path}
              to={r.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {r.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-wallet">
          {account && (
            <span className="wallet-address">
              {account.address.slice(0, 6)}…{account.address.slice(-4)}
            </span>
          )}
          <ConnectButton />
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>里程碑 L/C · Sui Devnet</span>
      </footer>
    </div>
  );
}
