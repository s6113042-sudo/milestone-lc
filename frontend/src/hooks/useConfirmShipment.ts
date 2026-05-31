import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { LC_CORE, PROTOCOL_CONFIG_ID, TREASURY_ID, CLOCK_ID } from '../constants';

export function useConfirmShipment() {
  const { mutateAsync, isPending, error } = useSignAndExecuteTransaction();

  const confirmShipment = async (lcId: string, goodsDescription: string, shipmentRef: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${LC_CORE}::confirm_shipment`,
      arguments: [
        tx.object(lcId),
        tx.pure.string(goodsDescription),
        tx.pure.string(shipmentRef),
        tx.object(CLOCK_ID),
        tx.object(TREASURY_ID),
        tx.object(PROTOCOL_CONFIG_ID),
      ],
    });
    return mutateAsync({ transaction: tx });
  };

  return { confirmShipment, isPending, error };
}
