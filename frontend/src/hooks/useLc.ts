// Hooks for L/C contract interactions.
// TODO: wire up after @mysten/dapp-kit is configured and CONTRACT ids are set.

export function useCreateLc() {
  return {
    // TODO: return { mutate, isPending } using useSignAndExecuteTransaction
    mutate: (_params: unknown) => Promise.resolve(),
    isPending: false,
  };
}

export function useFundLc() {
  return {
    mutate: (_lcId: string, _amount: bigint) => Promise.resolve(),
    isPending: false,
  };
}

export function useConfirmShipment() {
  return {
    mutate: (_lcId: string, _goodsDescription: string, _shipmentRef: string) => Promise.resolve(),
    isPending: false,
  };
}

export function useCompletePickup() {
  return {
    mutate: (_lcId: string, _nftId: string) => Promise.resolve(),
    isPending: false,
  };
}

export function useBuyerReclaim() {
  return {
    mutate: (_lcId: string) => Promise.resolve(),
    isPending: false,
  };
}
