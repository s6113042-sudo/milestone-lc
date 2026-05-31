import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { RPC_URL, NETWORK } from '../config.js';

export const suiClient = new SuiJsonRpcClient({ url: RPC_URL, network: NETWORK });

// Parse moveObject fields from a raw SuiObjectResponse (typed as unknown for compatibility)
export function getObjectFields(obj: unknown): Record<string, unknown> | null {
  const data = (obj as { data?: { objectId?: string; content?: unknown } | null })?.data;
  if (!data?.objectId) return null;
  const content = data.content as { dataType?: string; fields?: Record<string, unknown> } | null | undefined;
  if (!content || content.dataType !== 'moveObject' || !content.fields) return null;
  return content.fields;
}

export function getObjectId(obj: unknown): string {
  return (obj as { data?: { objectId?: string } | null })?.data?.objectId ?? '';
}

export function parseMoveOption(v: unknown): string | null {
  if (v == null) return null;
  const o = v as { type?: string; fields?: { name?: unknown } };
  if (o.type === 'None') return null;
  if (o.fields?.name != null) return String(o.fields.name);
  return null;
}
