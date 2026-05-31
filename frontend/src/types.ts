export interface LetterOfCredit {
  id: string;
  buyer: string;
  seller: string;
  recovery_address: string | null;
  amount: string;
  currency: number;
  terms_hash: number[];
  status: number;
  ship_deadline_ms: string;
  pickup_deadline_ms: string;
  shipment_ref: string | null;
  dispute_evidence_hash: number[] | null;
}

export interface PickupNFT {
  id: string;
  lc_id: string;
  goods_description: string;
  seller: string;
  used: boolean;
}

export interface TreasuryState {
  sui_buffer: string;
  usdc_buffer: string;
  pending_sui: string;
  pending_usdc: string;
  hasui_held: string;
  scoin_held: string;
  protocol_fee_sui: string;
  protocol_fee_usdc: string;
}
