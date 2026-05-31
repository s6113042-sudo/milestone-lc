import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID, TREASURY_ID, CLOCK_ID } from '../constants';

export function useBuyerReclaim() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const buyerReclaim = async (lcId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::buyer_reclaim`,
      arguments: [
        tx.object(lcId),
        tx.object(CLOCK_ID),
        tx.object(TREASURY_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { buyerReclaim, isPending, error };
}
