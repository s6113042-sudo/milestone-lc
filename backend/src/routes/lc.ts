import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { suiClient } from '../chain/client.js';
import { lcStore, getLcsByAddress, getLcsByBuyer, getLcsBySeller, parseLcObject } from '../store/lcStore.js';

const router = Router();

const SUI_ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;
const isAddr = (v: string) => SUI_ADDR_RE.test(v);

// GET /api/lc/:address — 查詢某地址的所有 L/C
router.get('/:address', async (req: Request, res: Response) => {
  const address = String(req.params.address);
  if (!isAddr(address)) return res.status(400).json({ error: '無效的 Sui 地址格式' });

  const role = req.query.role as string | undefined;
  const allowed = ['buyer', 'seller', undefined];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'role 必須為 buyer 或 seller' });

  let results;
  if (role === 'buyer')       results = getLcsByBuyer(address);
  else if (role === 'seller') results = getLcsBySeller(address);
  else                        results = getLcsByAddress(address);

  return res.json({ data: results, total: results.length });
});

// GET /api/lc/detail/:lcId — 單筆 L/C 詳情
router.get('/detail/:lcId', async (req: Request, res: Response) => {
  const lcId = String(req.params.lcId);
  if (!isAddr(lcId)) return res.status(400).json({ error: '無效的 Object ID 格式' });

  if (lcStore.has(lcId)) return res.json({ data: lcStore.get(lcId), source: 'cache' });

  try {
    const obj = await suiClient.getObject({ id: lcId, options: { showContent: true } });
    const lc  = parseLcObject(obj);
    if (!lc) return res.status(404).json({ error: 'L/C 不存在或尚未索引' });
    lcStore.set(lc.id, lc);
    return res.json({ data: lc, source: 'chain' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST /api/lc/metadata — 接受交易條款文字，返回 SHA-256 hash
router.post('/metadata', (req: Request, res: Response) => {
  const { terms } = req.body as { terms?: unknown };
  if (!terms || typeof terms !== 'string') return res.status(400).json({ error: '缺少 terms 字串欄位' });
  if (terms.length > 100_000)             return res.status(400).json({ error: 'terms 超過 100 KB 上限' });

  const hash  = createHash('sha256').update(terms, 'utf8').digest();
  return res.json({ hex: hash.toString('hex'), bytes: Array.from(hash) });
});

export default router;
