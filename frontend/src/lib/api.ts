const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} 失敗：${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} 失敗：${res.status}`);
  return res.json() as Promise<T>;
}

export interface ApyResponse { sui: number; usdc: number }
export interface MetadataHashResponse { hex: string; bytes: number[] }
export interface TreasuryHealth {
  sui:  { buffer: number; pending: number; hasui: string; health: number };
  usdc: { buffer: number; pending: number; scoin: string; health: number };
}

export const api = {
  getApy:          ()              => get<ApyResponse>('/api/yield/apy'),
  hashTerms:       (terms: string) => post<MetadataHashResponse>('/api/lc/metadata', { terms }),
  getTreasuryHealth: ()            => get<TreasuryHealth>('/api/treasury/health'),
  getTreasuryFees: ()              => get<{ feeSui: number; feeUsdc: number }>('/api/treasury/fees'),
  getLcsByAddress: (addr: string, role?: 'buyer' | 'seller') =>
    get<{ data: unknown[]; total: number }>(
      `/api/lc/${addr}${role ? `?role=${role}` : ''}`
    ),
  verifyNft: (nftId: string) =>
    get<{ valid: boolean; used: boolean; lc_id: string; goods_description: string }>(`/api/nft/verify/${nftId}`),
};
