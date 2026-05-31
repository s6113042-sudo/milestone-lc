import { suiClient, parseMoveOption } from '../chain/client.js';
import { lcStore, parseLcObject } from '../store/lcStore.js';
import {
  LC_CORE_MODULE,
  INDEXER_POLL_MS,
  INDEXER_EVENT_LIMIT,
} from '../config.js';

type EventId = { txDigest: string; eventSeq: string };
let lastCursor: EventId | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

// ── 批次抓取並更新 LC 物件 ────────────────────────────────────────────────────

async function refreshLcs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const results = await suiClient.multiGetObjects({ ids, options: { showContent: true } });
  for (const obj of results) {
    const lc = parseLcObject(obj);
    if (lc) lcStore.set(lc.id, lc);
  }
}

// ── 單輪事件輪詢 ──────────────────────────────────────────────────────────────

async function pollOnce(): Promise<void> {
  try {
    const events = await suiClient.queryEvents({
      query: { MoveEventModule: { package: LC_CORE_MODULE.split('::')[0], module: 'lc_core' } },
      cursor: lastCursor ?? undefined,
      limit: INDEXER_EVENT_LIMIT,
      order: 'ascending',
    });

    if (events.data.length === 0) return;

    const affectedIds = new Set<string>();

    for (const ev of events.data) {
      const parsed = ev.parsedJson as Record<string, string> | null;
      if (parsed?.lc_id) affectedIds.add(parsed.lc_id);
      lastCursor = ev.id as EventId;
    }

    await refreshLcs(Array.from(affectedIds));
    console.log(`[indexer] 輪詢：${events.data.length} 個事件，影響 ${affectedIds.size} 筆 L/C`);
  } catch (err) {
    console.error('[indexer] 輪詢失敗：', err);
  }
}

// ── 啟動時全量載入歷史事件 ────────────────────────────────────────────────────

async function initialLoad(): Promise<void> {
  console.log('[indexer] 初始載入歷史 L/C 事件...');
  const allIds = new Set<string>();
  let cursor: EventId | undefined;

  // 逐頁讀取 LCCreated 事件，抓取所有 LC ID
  while (true) {
    const page = await suiClient.queryEvents({
      query: { MoveEventType: `${LC_CORE_MODULE}::LCCreated` },
      cursor,
      limit: 100,
      order: 'ascending',
    });

    for (const ev of page.data) {
      const parsed = ev.parsedJson as { lc_id?: string } | null;
      if (parsed?.lc_id) allIds.add(parsed.lc_id);
      lastCursor = ev.id as EventId;
    }

    if (!page.hasNextPage) break;
    cursor = page.nextCursor as EventId;
  }

  // 批次 50 個一組抓取最新物件狀態
  const ids = Array.from(allIds);
  for (let i = 0; i < ids.length; i += 50) {
    await refreshLcs(ids.slice(i, i + 50));
  }

  console.log(`[indexer] 初始載入完成，共 ${lcStore.size} 筆 L/C`);
}

// ── 對外啟動函式 ─────────────────────────────────────────────────────────────

export async function startIndexer(): Promise<void> {
  await initialLoad();

  const tick = async () => {
    await pollOnce();
    pollTimer = setTimeout(tick, INDEXER_POLL_MS);
  };

  pollTimer = setTimeout(tick, INDEXER_POLL_MS);
  console.log(`[indexer] 啟動輪詢，間隔 ${INDEXER_POLL_MS / 1000}s`);
}

export function stopIndexer(): void {
  if (pollTimer) clearTimeout(pollTimer);
}
