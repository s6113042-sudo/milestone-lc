import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import lcRoutes from './routes/lc.js';
import nftRoutes from './routes/nft.js';
import treasuryRoutes from './routes/treasury.js';
import yieldRoutes from './routes/yield.js';
import { startIndexer } from './services/indexer.js';
import { startKeeper } from './bot/keeper.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/lc',       lcRoutes);
app.use('/api/nft',      nftRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/yield',    yieldRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, store: 'memory' }));

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, async () => {
  console.log(`後端監聽 :${PORT}`);
  // 啟動 indexer（初始載入 + 定時輪詢）
  await startIndexer();
  // 啟動 keeper（定時 replenish，需 ADMIN_MNEMONIC env var）
  await startKeeper();
});
