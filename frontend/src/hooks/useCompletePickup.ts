import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID, TREASURY_ID } from '../constants';

export function useCompletePickup() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const completePickup = async (lcId: string, nftId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::complete_pickup`,
      arguments: [
        tx.object(lcId),
        tx.object(nftId),
        tx.object(TREASURY_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { completePickup, isPending, error };
}
