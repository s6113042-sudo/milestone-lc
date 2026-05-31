import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE } from '../constants';

export function useSetRecoveryAddress() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const setRecoveryAddress = async (lcId: string, recoveryAddress: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::set_recovery_address`,
      arguments: [
        tx.object(lcId),
        tx.pure.address(recoveryAddress),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { setRecoveryAddress, isPending, error };
}
