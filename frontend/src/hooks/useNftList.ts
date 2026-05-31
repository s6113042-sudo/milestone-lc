import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';
import { PICKUP_NFT_TYPE } from '../constants';
import type { PickupNFT } from '../types';

export function useNftList(owner: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['nft-list', owner],
    enabled: !!owner,
    queryFn: async () => {
      if (!owner) return [];

      const response = await client.getOwnedObjects({
        owner,
        filter: { StructType: PICKUP_NFT_TYPE },
        options: { showContent: true },
      });

      const nfts: PickupNFT[] = [];
      for (const item of response.data) {
        const content = item.data?.content;
        if (!content || content.dataType !== 'moveObject') continue;
        const f = (content as { dataType: string; fields: Record<string, unknown> }).fields;
        nfts.push({
          id: item.data!.objectId,
          lc_id: String(f.lc_id),
          goods_description: String(f.goods_description),
          seller: String(f.seller),
          used: Boolean(f.used),
        });
      }
      return nfts;
    },
    staleTime: 10_000,
  });
}
