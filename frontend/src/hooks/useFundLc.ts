import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID, TREASURY_ID, STAKING_POOL_ID, LENDING_POOL_ID, CURRENCY_SUI, PACKAGE_ID } from '../constants';

export function useFundLc() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const fundSui = async (lcId: string, amountMist: bigint) => {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
    tx.moveCall({
      target: `${LC_CORE}::fund_sui`,
      arguments: [
        tx.object(lcId),
        coin,
        tx.object(TREASURY_ID),
        tx.object(STAKING_POOL_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  const fundUsdc = async (lcId: string, usdcCoinId: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::fund_usdc`,
      typeArguments: [`${PACKAGE_ID}::usdc::USDC`],
      arguments: [
        tx.object(lcId),
        tx.object(usdcCoinId),
        tx.object(TREASURY_ID),
        tx.object(LENDING_POOL_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  const fund = async (lcId: string, currency: number, amountMist: bigint, usdcCoinId?: string) => {
    if (currency === CURRENCY_SUI) return fundSui(lcId, amountMist);
    if (!usdcCoinId) throw new Error('USDC coin object ID required');
    return fundUsdc(lcId, usdcCoinId);
  };

  return { fund, fundSui, fundUsdc, isPending, error };
}
