import { getObjectFields, getObjectId, parseMoveOption } from '../chain/client.js';

export interface LcRecord {
  id: string;
  buyer: string;
  seller: string;
  recovery_address: string | null;
  amount: string;
  currency: number;
  status: number;
  ship_deadline_ms: string;
  pickup_deadline_ms: string;
  shipment_ref: string | null;
  terms_hash: number[];
}

// Keyed by LC object ID
export const lcStore = new Map<string, LcRecord>();

export function parseLcObject(obj: unknown): LcRecord | null {
  const fields = getObjectFields(obj);
  if (!fields) return null;
  const id = getObjectId(obj);
  if (!id) return null;

  return {
    id,
    buyer: String(fields.buyer ?? ''),
    seller: String(fields.seller ?? ''),
    recovery_address: parseMoveOption(fields.recovery_address),
    amount: String(fields.amount ?? '0'),
    currency: Number(fields.currency ?? 0),
    status: Number(fields.status ?? 0),
    ship_deadline_ms: String(fields.ship_deadline_ms ?? '0'),
    pickup_deadline_ms: String(fields.pickup_deadline_ms ?? '0'),
    shipment_ref: parseMoveOption(fields.shipment_ref),
    terms_hash: Array.isArray(fields.terms_hash) ? (fields.terms_hash as number[]) : [],
  };
}

export function getLcsByBuyer(buyer: string): LcRecord[] {
  return Array.from(lcStore.values()).filter(lc => lc.buyer === buyer);
}

export function getLcsBySeller(seller: string): LcRecord[] {
  return Array.from(lcStore.values()).filter(lc => lc.seller === seller);
}

export function getLcsByAddress(address: string): LcRecord[] {
  return Array.from(lcStore.values()).filter(
    lc => lc.buyer === address || lc.seller === address
  );
}
