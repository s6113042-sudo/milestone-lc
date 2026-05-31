export const NETWORK = 'devnet';

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

export const ADMIN_CAP_ID =
  '0xc4bc348f4bcdc9f62a436fe15c1d9f565fcdc2b53af7691590c77a7ee4092743';

export const CLOCK_ID =
  '0x0000000000000000000000000000000000000000000000000000000000000006';

export const LC_CORE = `${PACKAGE_ID}::lc_core`;
export const PICKUP_NFT_TYPE = `${PACKAGE_ID}::pickup_nft::PickupNFT`;
export const LC_TYPE = `${PACKAGE_ID}::lc_core::LetterOfCredit`;

export const CURRENCY_SUI = 0;
export const CURRENCY_USDC = 1;

export const STATUS_LABELS: Record<number, string> = {
  0: '已建立',
  1: '已資金',
  2: '已出貨',
  3: '已完成',
  4: '賣方違約',
  5: '爭議中',
  6: '已退款',
};

export const STATUS_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#2563eb',
  2: '#d97706',
  3: '#16a34a',
  4: '#dc2626',
  5: '#ea580c',
  6: '#7c3aed',
};

export const MIST_PER_SUI = 1_000_000_000n;
export const USDC_DECIMALS = 6;
