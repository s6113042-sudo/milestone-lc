import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { LC_CORE } from '../constants';
import { api } from '../lib/api';
import type { LetterOfCredit } from '../types';

// ── 共用：從 Sui RPC 解析 LC 物件 ──────────────────────────────────────────

function getFields(obj: unknown): Record<string, unknown> | null {
  const data = (obj as { data?: { objectId?: string; content?: unknown } | null })?.data;
  if (!data?.objectId) return null;
  const content = data.content as { dataType?: string; fields?: Record<string, unknown> } | null | undefined;
  if (!content || content.dataType !== 'moveObject' || !content.fields) return null;
  return content.fields;
}

function getObjectId(obj: unknown): string {
  return (obj as { data?: { objectId?: string } | null })?.data?.objectId ?? '';
}

function parseMoveOption(v: unknown): string | null {
  if (v == null) return null;
  const o = v as { type?: string; fields?: { name?: unknown } };
  if (o.type === 'None') return null;
  if (o.fields?.name != null) return String(o.fields.name);
  return null;
}

function parseLC(obj: unknown): LetterOfCredit | null {
  const fields = getFields(obj);
  if (!fields) return null;
  const id = getObjectId(obj);
  if (!id) return null;
  return {
    id,
    buyer:              String(fields.buyer  ?? ''),
    seller:             String(fields.seller ?? ''),
    recovery_address:   parseMoveOption(fields.recovery_address),
    amount:             String(fields.amount ?? '0'),
    currency:           Number(fields.currency ?? 0),
    terms_hash:         Array.isArray(fields.terms_hash) ? (fields.terms_hash as number[]) : [],
    status:             Number(fields.status ?? 0),
    ship_deadline_ms:   String(fields.ship_deadline_ms   ?? '0'),
    pickup_deadline_ms: String(fields.pickup_deadline_ms ?? '0'),
    shipment_ref:       parseMoveOption(fields.shipment_ref),
    dispute_evidence_hash: null,
  };
}

// ── Sui RPC fallback（事件查詢）─────────────────────────────────────────────

async function fetchViaSui(
  client: ReturnType<typeof useSuiClient>,
  filterKey: 'buyer' | 'seller',
  address: string,
): Promise<LetterOfCredit[]> {
  const events = await client.queryEvents({
    query: { MoveEventType: `${LC_CORE}::LCCreated` },
    limit: 100,
  });

  const lcIds = events.data
    .filter(e => (e.parsedJson as Record<string, string>)?.[filterKey] === address)
    .map(e => (e.parsedJson as { lc_id: string }).lc_id);

  if (lcIds.length === 0) return [];

  const results = await client.multiGetObjects({ ids: lcIds, options: { showContent: true } });
  return results.map(parseLC).filter(Boolean) as LetterOfCredit[];
}

// ── 公開 hooks ──────────────────────────────────────────────────────────────

export function useLcListByBuyer(buyer: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['lc-list-buyer', buyer],
    enabled:  !!buyer,
    queryFn: async () => {
      if (!buyer) return [];
      // 後端優先（indexer 快取）
      try {
        const res = await api.getLcs(buyer, 'buyer');
        return res.data;
      } catch {
        // fallback：直接查 Sui RPC
        return fetchViaSui(client, 'buyer', buyer);
      }
    },
    staleTime: 10_000,
  });
}

export function useLcListBySeller(seller: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['lc-list-seller', seller],
    enabled:  !!seller,
    queryFn: async () => {
      if (!seller) return [];
      try {
        const res = await api.getLcs(seller, 'seller');
        return res.data;
      } catch {
        return fetchViaSui(client, 'seller', seller);
      }
    },
    staleTime: 10_000,
  });
}

export function useLcObject(lcId: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['lc-object', lcId],
    enabled:  !!lcId,
    queryFn: async () => {
      if (!lcId) return null;
      // 後端優先
      try {
        const res = await api.getLcDetail(lcId);
        return res.data;
      } catch {
        const result = await client.getObject({ id: lcId, options: { showContent: true } });
        return parseLC(result);
      }
    },
    staleTime: 5_000,
  });
}
