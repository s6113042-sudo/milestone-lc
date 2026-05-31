import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, TREASURY_ID, STAKING_POOL_ID, LENDING_POOL_ID, PROTOCOL_CONFIG_ID } from '../constants';

export function useReplenish() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const replenishSui = async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::treasury::replenish_sui`,
      arguments: [
        tx.object(TREASURY_ID),
        tx.object(STAKING_POOL_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  const replenishUsdc = async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::treasury::replenish_usdc`,
      arguments: [
        tx.object(TREASURY_ID),
        tx.object(LENDING_POOL_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { replenishSui, replenishUsdc, isPending, error };
}
