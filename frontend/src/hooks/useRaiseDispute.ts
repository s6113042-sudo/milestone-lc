import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE } from '../constants';

export function useRaiseDispute() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const raiseDispute = async (lcId: string, evidenceText: string) => {
    const encoded = new TextEncoder().encode(evidenceText);
    const hashBytes = Array.from(encoded.slice(0, 32)).concat(
      Array(Math.max(0, 32 - encoded.length)).fill(0),
    );

    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::raise_dispute`,
      arguments: [
        tx.object(lcId),
        tx.pure.vector('u8', hashBytes),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { raiseDispute, isPending, error };
}
