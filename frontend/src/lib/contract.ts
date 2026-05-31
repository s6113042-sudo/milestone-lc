// Contract addresses — devnet deployment (Phase 2, with Haedal + Scallop mocks bundled)
// Package includes: milestone_lc, mock_haedal, mock_scallop, test_coins

export const CONTRACT = {
  PACKAGE_ID: '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a',

  // Shared objects
  PROTOCOL_CFG:  '0x9e460320a8fca762d92a6fcce9a0745b2298b4864ef327c67e519b0ca7bfb987',
  TREASURY_ID:   '0x098c6c269325becec76c2e54db0d3dc63d6ed043aefa02916b1ab4c246cdd412',
  STAKING_POOL:  '0x7788bb2e5e1819ce26600e0b7fcfded08044b6f1f8e20f2ff7869e7978bbdee7',
  LENDING_POOL_USDC: '0x3b996ae634d0645df1277aaac25a295e79b0358bb7d0d81aceb618df34c42045',

  // Admin wallet objects
  ADMIN_CAP:     '0xc4bc348f4bcdc9f62a436fe15c1d9f565fcdc2b53af7691590c77a7ee4092743',
  USDC_TREASURY_CAP: '0x7d3545286fc6009170671f42dae8ebce248c662446f52756541ed4fcf2c85330',
  UPGRADE_CAP:   '0xc50dbf5e90da75feff0c8abdfcbbb8a2401361da5cea75f4a00e6c4f0b000db3',

  // Coin types
  USDC_TYPE: '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a::usdc::USDC',
  HASUI_TYPE: '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a::staking::HASUI',

  // Module paths
  LC_CORE:      '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a::lc_core',
  PICKUP_NFT:   '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a::pickup_nft',
  TREASURY_MOD: '0x95eef62d4099476bd7c83b3ceb3320770e689799f8d2f00e75b65520f3c64d9a::treasury',
} as const;
