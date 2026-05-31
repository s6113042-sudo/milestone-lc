import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { suiClient, getObjectFields } from '../chain/client.js';
import {
  PACKAGE_ID,
  TREASURY_ID,
  STAKING_POOL_ID,
  LENDING_POOL_ID,
  PROTOCOL_CONFIG_ID,
  KEEPER_INTERVAL_MS,
} from '../config.js';

let keeperTimer: ReturnType<typeof setTimeout> | null = null;

// ── 取得 keypair（從環境變數）────────────────────────────────────────────────

function getKeypair(): Ed25519Keypair | null {
  const mnemonic = process.env.ADMIN_MNEMONIC?.trim();
  if (!mnemonic) {
    console.warn('[keeper] ADMIN_MNEMONIC 未設定，跳過 replenish');
    return null;
  }
  try {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  } catch {
    console.warn('[keeper] ADMIN_MNEMONIC 無效（非 BIP39 助記詞），keeper 停用');
    return null;
  }
}

// ── 簽名並執行交易 ────────────────────────────────────────────────────────────

async function signAndExecute(keypair: Ed25519Keypair, tx: Transaction): Promise<void> {
  const bytes = await tx.build({ client: suiClient as never });
  const { signature } = await keypair.signTransaction(bytes);
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: Buffer.from(bytes).toString('base64'),
    signature,
    options: { showEffects: true },
  });
  const status = (result.effects as { status?: { status?: string } } | null)?.status?.status;
  if (status !== 'success') {
    throw new Error(`交易失敗：${JSON.stringify(result.effects)}`);
  }
}

// ── 單次 replenish ────────────────────────────────────────────────────────────

async function replenishOnce(): Promise<void> {
  const keypair = getKeypair();
  if (!keypair) return;

  let treasury: unknown;
  try {
    treasury = await suiClient.getObject({ id: TREASURY_ID, options: { showContent: true } });
  } catch (e) {
    console.error('[keeper] 無法讀取 Treasury：', e);
    return;
  }

  const fields = getObjectFields(treasury);
  if (!fields) return;

  const pendingSui  = BigInt(String(fields.pending_sui  ?? '0'));
  const pendingUsdc = BigInt(String(fields.pending_usdc ?? '0'));

  // ── replenish SUI ──
  if (pendingSui > 0n) {
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::treasury::replenish_sui`,
        arguments: [
          tx.object(TREASURY_ID),
          tx.object(STAKING_POOL_ID),
          tx.object(PROTOCOL_CONFIG_ID),
        ],
      });
      await signAndExecute(keypair, tx);
      console.log(`[keeper] replenish_sui 完成（pending=${pendingSui} MIST）`);
    } catch (e) {
      console.error('[keeper] replenish_sui 失敗：', e);
    }
  }

  // ── replenish USDC ──
  if (pendingUsdc > 0n) {
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::treasury::replenish_usdc`,
        arguments: [
          tx.object(TREASURY_ID),
          tx.object(LENDING_POOL_ID),
          tx.object(PROTOCOL_CONFIG_ID),
        ],
      });
      await signAndExecute(keypair, tx);
      console.log(`[keeper] replenish_usdc 完成（pending=${pendingUsdc} raw）`);
    } catch (e) {
      console.error('[keeper] replenish_usdc 失敗：', e);
    }
  }

  if (pendingSui === 0n && pendingUsdc === 0n) {
    console.log('[keeper] 無待贖回部位，跳過');
  }
}

// ── 對外啟動函式 ─────────────────────────────────────────────────────────────

export async function startKeeper(): Promise<void> {
  if (!process.env.ADMIN_MNEMONIC) {
    console.warn('[keeper] ADMIN_MNEMONIC 未設定，keeper 不啟動');
    return;
  }

  console.log(`[keeper] 啟動，間隔 ${KEEPER_INTERVAL_MS / 60000} 分鐘`);

  // 立即執行一次，之後定時重複
  await replenishOnce();

  const tick = async () => {
    await replenishOnce();
    keeperTimer = setTimeout(tick, KEEPER_INTERVAL_MS);
  };
  keeperTimer = setTimeout(tick, KEEPER_INTERVAL_MS);
}

export function stopKeeper(): void {
  if (keeperTimer) clearTimeout(keeperTimer);
}
