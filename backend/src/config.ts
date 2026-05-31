export const NETWORK = 'devnet';
export const RPC_URL = 'https://fullnode.devnet.sui.io:443';

export const PACKAGE_ID =
  '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a';

export const PROTOCOL_CONFIG_ID =
  '0x9e460320a8fca762d92a6fcce9a0745b2298b4864ef327c67e519b0ca7bfb987';

export const TREASURY_ID =
  '0x098c6c269325becec76c2e54db0d3dc63d6ed043aefa02916b1ab4c246cdd412';

export const STAKING_POOL_ID =
  '0x7788bb2e5e1819ce26600e0b7fcfded08044b6f1f8e20f2ff7869e7978bbdee7';

export const LENDING_POOL_ID =
  '0x3b996ae634d0645df1277aaac25a295e79b0358bb7d0d81aceb618df34c42045';

export const LC_CORE_MODULE = `${PACKAGE_ID}::lc_core`;
export const PICKUP_NFT_TYPE = `${PACKAGE_ID}::pickup_nft::PickupNFT`;

export const KEEPER_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes
export const INDEXER_POLL_MS    = 10 * 1000;         // 10 seconds
export const INDEXER_EVENT_LIMIT = 50;
