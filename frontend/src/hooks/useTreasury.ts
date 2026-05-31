import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { TREASURY_ID } from '../constants';
import type { TreasuryState } from '../types';

export function useTreasury() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['treasury'],
    queryFn: async () => {
      const result = await client.getObject({ id: TREASURY_ID, options: { showContent: true } });
      const content = result.data?.content;
      if (!content || content.dataType !== 'moveObject') return null;
      const f = (content as { dataType: string; fields: Record<string, unknown> }).fields;

      return {
        sui_buffer: String(f.sui_buffer ?? '0'),
        usdc_buffer: String(f.usdc_buffer ?? '0'),
        pending_sui: String(f.pending_sui ?? '0'),
        pending_usdc: String(f.pending_usdc ?? '0'),
        hasui_held: String(f.hasui_balance ?? '0'),
        scoin_held: String(f.scoin_balance ?? '0'),
        protocol_fee_sui: String(f.protocol_fee_sui ?? '0'),
        protocol_fee_usdc: String(f.protocol_fee_usdc ?? '0'),
      } as TreasuryState;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
