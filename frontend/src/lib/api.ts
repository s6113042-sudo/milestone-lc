import type { LetterOfCredit } from '../types';

const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Response types ──────────────────────────────────────────────────────────

export interface ApyResponse         { sui: number; usdc: number }
export interface MetadataHashResponse { hex: string; bytes: number[] }
export interface TreasuryHealth {
  sui:  { buffer: number; pending: number; hasui: string; health: number };
  usdc: { buffer: number; pending: number; scoin: string; health: number };
}
export interface TreasuryFees { feeSui: number; feeUsdc: number }
export interface NftVerifyResult {
  valid: boolean;
  used:  boolean;
  lc_id: string;
  goods_description: string;
  seller: string;
}

// ── API 呼叫 ────────────────────────────────────────────────────────────────

export const api = {
  // 後端 APY（從 mock 協議 exchange rate 估算）
  getApy: () =>
    get<ApyResponse>('/api/yield/apy'),

  // 交易條款 SHA-256（bytes 直接傳合約）
  hashTerms: (terms: string) =>
    post<MetadataHashResponse>('/api/lc/metadata', { terms }),

  // L/C 列表（來自 indexer 快取）
  getLcs: (address: string, role?: 'buyer' | 'seller') =>
    get<{ data: LetterOfCredit[]; total: number }>(
      `/api/lc/${address}${role ? `?role=${role}` : ''}`
    ),

  // 單筆 L/C（快取 miss 時打鏈）
  getLcDetail: (lcId: string) =>
    get<{ data: LetterOfCredit; source: string }>(`/api/lc/detail/${lcId}`),

  // 金庫健康度
  getTreasuryHealth: () =>
    get<TreasuryHealth>('/api/treasury/health'),

  // 協議手續費
  getTreasuryFees: () =>
    get<TreasuryFees>('/api/treasury/fees'),

  // NFT 驗證
  verifyNft: (nftId: string) =>
    get<NftVerifyResult>(`/api/nft/verify/${nftId}`),

  // 地址持有的 NFT
  getNfts: (address: string) =>
    get<{ data: { id: string; lc_id: string; goods_description: string; seller: string; used: boolean }[]; total: number }>(
      `/api/nft/${address}`
    ),
};
