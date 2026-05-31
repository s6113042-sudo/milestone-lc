import { Router, Request, Response } from 'express';
import { suiClient, getObjectFields, getObjectId } from '../chain/client.js';
import { PICKUP_NFT_TYPE } from '../config.js';

const router = Router();

function parseNft(obj: unknown) {
  const f = getObjectFields(obj);
  if (!f) return null;
  const id = getObjectId(obj);
  if (!id) return null;
  return {
    id,
    lc_id: String(f.lc_id ?? ''),
    goods_description: String(f.goods_description ?? ''),
    seller: String(f.seller ?? ''),
    used: Boolean(f.used),
  };
}

// GET /api/nft/:address — 某地址持有的所有 PickupNFT
router.get('/:address', async (req: Request, res: Response) => {
  const address = String(req.params.address);
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

// GET /api/nft/verify/:nftId — 驗證 NFT 有效性（is_used）
router.get('/verify/:nftId', async (req: Request, res: Response) => {
  const nftId = String(req.params.nftId);
  try {
    const obj = await suiClient.getObject({ id: nftId, options: { showContent: true } });
    const nft = parseNft(obj);
    if (!nft) return res.status(404).json({ error: 'NFT 不存在' });

    return res.json({
      valid: !nft.used,
      used:  nft.used,
      lc_id: nft.lc_id,
      goods_description: nft.goods_description,
      seller: nft.seller,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// POST /api/nft/metadata — 儲存貨物描述（僅記錄，返回 metadata URI 佔位）
router.post('/metadata', (req: Request, res: Response) => {
  const { nft_id, goods_description } = req.body as {
    nft_id?: string;
    goods_description?: string;
  };
  if (!nft_id || !goods_description) {
    return res.status(400).json({ error: '缺少 nft_id 或 goods_description' });
  }
  // 實際環境：上傳到 S3 / IPFS。此處返回佔位 URI。
  const uri = `https://milestone-lc.example/nft/${nft_id}`;
  return res.json({ uri, nft_id });
});

export default router;
