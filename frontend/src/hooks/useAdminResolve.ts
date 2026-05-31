import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID, TREASURY_ID, ADMIN_CAP_ID } from '../constants';

export function useAdminResolve() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const adminResolve = async (lcId: string, payToBuyer: boolean) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::admin_resolve`,
      arguments: [
        tx.object(ADMIN_CAP_ID),
        tx.object(lcId),
        tx.pure.bool(payToBuyer),
        tx.object(TREASURY_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { adminResolve, isPending, error };
}
