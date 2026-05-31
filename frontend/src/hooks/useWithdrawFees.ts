import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, TREASURY_ID, ADMIN_CAP_ID } from '../constants';

export function useWithdrawFees() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();

  const withdrawSui = async () => {
    if (!account) throw new Error('錢包未連接');
    const tx = new Transaction();
    const coin = tx.moveCall({
      target: `${PACKAGE_ID}::treasury::withdraw_fee_sui`,
      arguments: [tx.object(ADMIN_CAP_ID), tx.object(TREASURY_ID)],
    });
    tx.transferObjects([coin], tx.pure.address(account.address));
    return mutateAsync({ transaction: tx });
  };

  const withdrawUsdc = async () => {
    if (!account) throw new Error('錢包未連接');
    const tx = new Transaction();
    const coin = tx.moveCall({
      target: `${PACKAGE_ID}::treasury::withdraw_fee_usdc`,
      arguments: [tx.object(ADMIN_CAP_ID), tx.object(TREASURY_ID)],
    });
    tx.transferObjects([coin], tx.pure.address(account.address));
    return mutateAsync({ transaction: tx });
  };

  return { withdrawSui, withdrawUsdc, isPending, error };
}
