import { Router, Request, Response } from 'express';
import { suiClient, getObjectFields, getObjectId } from '../chain/client.js';
import { PICKUP_NFT_TYPE } from '../config.js';

const router = Router();

const SUI_ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;
const isAddr = (v: string) => SUI_ADDR_RE.test(v);

function parseNft(obj: unknown) {
  const f  = getObjectFields(obj);
  if (!f) return null;
  const id = getObjectId(obj);
  if (!id) return null;
  return {
    id,
    lc_id:             String(f.lc_id             ?? ''),
    goods_description: String(f.goods_description ?? ''),
    seller:            String(f.seller             ?? ''),
    used:              Boolean(f.used),
  };
}

// GET /api/nft/:address — 某地址持有的 PickupNFT
router.get('/:address', async (req: Request, res: Response) => {
  const address = String(req.params.address);
  if (!isAddr(address)) return res.status(400).json({ error: '無效的 Sui 地址格式' });

  try {
    const response = await suiClient.getOwnedObjects({
      owner: address,
      filter: { StructType: PICKUP_NFT_TYPE },
      options: { showContent: true },
    });
    const nfts = response.data.map(parseNft).filter(Boolean);
    return res.json({ data: nfts, total: nfts.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// GET /api/nft/verify/:nftId — 驗證 NFT 有效性
router.get('/verify/:nftId', async (req: Request, res: Response) => {
  const nftId = String(req.params.nftId);
  if (!isAddr(nftId)) return res.status(400).json({ error: '無效的 Object ID 格式' });

  try {
    const obj = await suiClient.getObject({ id: nftId, options: { showContent: true } });
    const nft = parseNft(obj);
    if (!nft) return res.status(404).json({ error: 'NFT 不存在' });
    return res.json({ valid: !nft.used, used: nft.used, lc_id: nft.lc_id, goods_description: nft.goods_description, seller: nft.seller });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST /api/nft/metadata
router.post('/metadata', (req: Request, res: Response) => {
  const { nft_id, goods_description } = req.body as { nft_id?: unknown; goods_description?: unknown };
  if (!nft_id || typeof nft_id !== 'string')                     return res.status(400).json({ error: '缺少 nft_id 字串' });
  if (!goods_description || typeof goods_description !== 'string') return res.status(400).json({ error: '缺少 goods_description 字串' });
  if (!isAddr(nft_id)) return res.status(400).json({ error: '無效的 nft_id 格式' });

  return res.json({ uri: `https://milestone-lc.example/nft/${nft_id}`, nft_id });
});

export default router;
