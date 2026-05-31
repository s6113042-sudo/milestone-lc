import { Router, Request, Response } from 'express';
import { suiClient, getObjectFields } from '../chain/client.js';
import { STAKING_POOL_ID, LENDING_POOL_ID } from '../config.js';
import { lcStore } from '../store/lcStore.js';

const router = Router();

// ── APY 估算（從 mock 協議的 exchange rate 反推）────────────────────────────

async function getHaedalApy(): Promise<number> {
  try {
    const obj = await suiClient.getObject({ id: STAKING_POOL_ID, options: { showContent: true } });
    const f = getObjectFields(obj);
    if (!f) return 0.042; // 預設 4.2%
    // mock_haedal 儲存 exchange_rate (haSUI per SUI * 1e9)
    // APY 從 exchange rate > 1 推算，mock 中通常為定值
    const rate = Number(f.exchange_rate ?? 1_000_000_000) / 1_000_000_000;
    // 簡化：若 rate > 1 則 APY ≈ (rate - 1) * 12（月化）
    return Math.max(0.01, (rate - 1) * 12);
  } catch {
    return 0.042;
  }
}

async function getScallopApy(): Promise<number> {
  try {
    const obj = await suiClient.getObject({ id: LENDING_POOL_ID, options: { showContent: true } });
    const f = getObjectFields(obj);
    if (!f) return 0.068; // 預設 6.8%
    const rate = Number(f.exchange_rate ?? 1_000_000) / 1_000_000;
    return Math.max(0.01, (rate - 1) * 12);
  } catch {
    return 0.068;
  }
}

// GET /api/yield/apy — 目前各幣種 APY
router.get('/apy', async (_req: Request, res: Response) => {
  const [suiApy, usdcApy] = await Promise.all([getHaedalApy(), getScallopApy()]);
  res.json({ sui: suiApy, usdc: usdcApy });
});

// GET /api/yield/:lcId — 估算某筆 L/C 的累積收益
router.get('/:lcId', async (req: Request, res: Response) => {
  const lcId = String(req.params.lcId);
  const lc = lcStore.get(lcId);
  if (!lc) return res.status(404).json({ error: 'L/C 不存在（尚未索引）' });

  // 僅 FUNDED/SETTLED 狀態才有累積收益
  if (lc.status < 1 || lc.status > 2) {
    return res.json({ accrued: 0, currency: lc.currency === 0 ? 'SUI' : 'USDC', apy: 0 });
  }

  const now = Date.now();
  const elapsed_ms = now - Number(lc.ship_deadline_ms) + (30 * 86400_000); // 估計存入時間
  const elapsed_years = Math.max(0, elapsed_ms) / (365.25 * 86400_000);

  const apy = lc.currency === 0 ? await getHaedalApy() : await getScallopApy();
  const principal = Number(lc.amount);
  const buyerShare = 0.7; // 70% 買方
  const accrued = principal * apy * elapsed_years * buyerShare;

  return res.json({
    accrued: Math.round(accrued),
    currency: lc.currency === 0 ? 'SUI' : 'USDC',
    apy,
    elapsed_days: Math.round(elapsed_ms / 86400_000),
  });
});

export default router;
