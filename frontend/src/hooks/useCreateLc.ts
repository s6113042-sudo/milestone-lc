import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID } from '../constants';

interface CreateLcParams {
  seller: string;
  amountMist: bigint;
  currency: number;
  termsHash: number[];
  shipDeadlineMs: bigint;
  pickupDeadlineMs: bigint;
}

export function useCreateLc() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const createLc = async (params: CreateLcParams) => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${LC_CORE}::create`,
      arguments: [
        tx.pure.address(params.seller),
        tx.pure.u64(params.amountMist),
        tx.pure.u8(params.currency),
        tx.pure.vector('u8', params.termsHash),
        tx.pure.u64(params.shipDeadlineMs),
        tx.pure.u64(params.pickupDeadlineMs),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });

    return mutateAsync({ transaction: tx });
  };

  return { createLc, isPending, error };
}
