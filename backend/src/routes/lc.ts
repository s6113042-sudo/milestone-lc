import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { suiClient } from '../chain/client.js';
import { lcStore, getLcsByAddress, getLcsByBuyer, getLcsBySeller, parseLcObject } from '../store/lcStore.js';

const router = Router();

// GET /api/lc/:address — 查詢某地址的所有 L/C（買方＋賣方）
router.get('/:address', async (req: Request, res: Response) => {
  const address = String(req.params.address);
  const role = (req.query.role as string | undefined);

  let results;
  if (role === 'buyer')  results = getLcsByBuyer(address);
  else if (role === 'seller') results = getLcsBySeller(address);
  else results = getLcsByAddress(address);

  res.json({ data: results, total: results.length });
});

// GET /api/lc/detail/:lcId — 單筆 L/C 詳情（優先查 store，否則打鏈）
router.get('/detail/:lcId', async (req: Request, res: Response) => {
  const lcId = String(req.params.lcId);

  // 先查快取
  if (lcStore.has(lcId)) {
    return res.json({ data: lcStore.get(lcId), source: 'cache' });
  }

  // 快取 miss → 打鏈
  try {
    const obj = await suiClient.getObject({ id: lcId, options: { showContent: true } });
    const lc = parseLcObject(obj);
    if (!lc) return res.status(404).json({ error: 'L/C 不存在或尚未索引' });
    lcStore.set(lc.id, lc);
    return res.json({ data: lc, source: 'chain' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST /api/lc/metadata — 接受交易條款文字，返回 SHA-256 hash（作為 terms_hash）
router.post('/metadata', (req: Request, res: Response) => {
  const { terms } = req.body as { terms?: string };
  if (!terms || typeof terms !== 'string') {
    return res.status(400).json({ error: '缺少 terms 欄位' });
  }

  const hash = createHash('sha256').update(terms, 'utf8').digest();
  // 回傳 hex 字串與 byte array（前端用 byte array 傳給合約）
  const hex = hash.toString('hex');
  const bytes = Array.from(hash);

  return res.json({ hex, bytes });
});

export default router;
