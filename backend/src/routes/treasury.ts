import { Router, Request, Response } from 'express';
import { suiClient, getObjectFields } from '../chain/client.js';
import { TREASURY_ID } from '../config.js';

const router = Router();

const MIST = 1_000_000_000;
const USDC_DEC = 1_000_000;

function toSui(mist: string)  { return Number(mist) / MIST; }
function toUsdc(raw: string)  { return Number(raw)  / USDC_DEC; }

// GET /api/treasury/health — 金庫備付率與各幣種餘額
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const obj = await suiClient.getObject({ id: TREASURY_ID, options: { showContent: true } });
    const f = getObjectFields(obj);
    if (!f) return res.status(502).json({ error: '無法讀取 Treasury 物件' });

    const suiBuffer  = String(f.sui_buffer  ?? '0');
    const pendingSui = String(f.pending_sui  ?? '0');
    const usdcBuffer  = String(f.usdc_buffer  ?? '0');
    const pendingUsdc = String(f.pending_usdc ?? '0');

    const suiHealth  = Number(pendingSui)  > 0 ? Number(suiBuffer)  / Number(pendingSui)  : 1;
    const usdcHealth = Number(pendingUsdc) > 0 ? Number(usdcBuffer) / Number(pendingUsdc) : 1;

    return res.json({
      sui: {
        buffer:   toSui(suiBuffer),
        pending:  toSui(pendingSui),
        hasui:    String(f.hasui_balance ?? '0'),
        health:   Math.min(suiHealth, 1),
      },
      usdc: {
        buffer:   toUsdc(usdcBuffer),
        pending:  toUsdc(pendingUsdc),
        scoin:    String(f.scoin_balance ?? '0'),
        health:   Math.min(usdcHealth, 1),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET /api/treasury/fees — 協議累積手續費
router.get('/fees', async (_req: Request, res: Response) => {
  try {
    const obj = await suiClient.getObject({ id: TREASURY_ID, options: { showContent: true } });
    const f = getObjectFields(obj);
    if (!f) return res.status(502).json({ error: '無法讀取 Treasury 物件' });

    return res.json({
      feeSui:  toSui(String(f.protocol_fee_sui  ?? '0')),
      feeUsdc: toUsdc(String(f.protocol_fee_usdc ?? '0')),
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
