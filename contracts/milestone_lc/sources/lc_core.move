/// lc_core: main Letter of Credit state machine.
module milestone_lc::lc_core {
    use std::string::String;
    use sui::clock::{Self, Clock};
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::event;
    use mock_haedal::staking::StakingPool;
    use mock_scallop::lending::LendingPool;
    use test_coins::usdc::USDC;
    use milestone_lc::protocol_config::{AdminCap, ProtocolConfig};
    use milestone_lc::protocol_config;
    use milestone_lc::pickup_nft::{Self, PickupNFT};
    use milestone_lc::treasury::{Self, Treasury};

    // ── Status constants ──────────────────────────────────────────────────────

    const STATUS_CREATED:        u8 = 0;
    const STATUS_FUNDED:         u8 = 1;
    const STATUS_SETTLED:        u8 = 2;
    const STATUS_COMPLETED:      u8 = 3;
    const STATUS_SELLER_DEFAULT: u8 = 4;
    const STATUS_DISPUTED:       u8 = 5;
    const STATUS_REFUNDED:       u8 = 6;

    const CURRENCY_SUI:  u8 = 0;
    const CURRENCY_USDC: u8 = 1;

    // ── Error codes ───────────────────────────────────────────────────────────

    const E_WRONG_STATUS:    u64 = 1;
    const E_NOT_BUYER:       u64 = 2;
    const E_NOT_SELLER:      u64 = 3;
    const E_WRONG_AMOUNT:    u64 = 4;
    const E_NOT_EXPIRED:     u64 = 5;
    const E_ALREADY_EXPIRED: u64 = 6;
    const E_NOT_PARTY:       u64 = 7;

    // ── Core object ───────────────────────────────────────────────────────────

    public struct LetterOfCredit has key, store {
        id: UID,
        buyer:            address,
        seller:           address,
        recovery_address: Option<address>,
        amount:           u64,
        currency:         u8,
        terms_hash:       vector<u8>,
        status:           u8,
        ship_deadline_ms:    u64,
        pickup_deadline_ms:  u64,
        shipment_ref:           Option<String>,
        dispute_evidence_hash:  Option<vector<u8>>,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct LCCreated has copy, drop {
        lc_id: ID, buyer: address, seller: address, amount: u64, currency: u8
    }
    public struct LCFunded has copy, drop    { lc_id: ID, currency: u8 }
    public struct GoodsShipped has copy, drop { lc_id: ID, nft_id: ID }
    public struct LCCompleted has copy, drop { lc_id: ID }
    public struct LCDisputed has copy, drop  { lc_id: ID, raised_by: address }
    public struct LCResolved has copy, drop  { lc_id: ID, winner: address }

    // ── Create ────────────────────────────────────────────────────────────────

    public fun create(
        seller:            address,
        amount:            u64,
        currency:          u8,
        terms_hash:        vector<u8>,
        ship_deadline_ms:  u64,
        pickup_deadline_ms: u64,
        cfg: &ProtocolConfig,
        ctx: &mut TxContext,
    ) {
        protocol_config::assert_not_paused(cfg);
        let lc = LetterOfCredit {
            id: object::new(ctx),
            buyer: ctx.sender(),
            seller,
            recovery_address: option::none(),
            amount,
            currency,
            terms_hash,
            status: STATUS_CREATED,
            ship_deadline_ms,
            pickup_deadline_ms,
            shipment_ref: option::none(),
            dispute_evidence_hash: option::none(),
        };
        event::emit(LCCreated {
            lc_id: object::id(&lc), buyer: ctx.sender(), seller, amount, currency,
        });
        transfer::share_object(lc);
    }

    // ── Fund: SUI path ────────────────────────────────────────────────────────

    public fun fund_sui(
        lc:      &mut LetterOfCredit,
        coin:    Coin<SUI>,
        treasury: &mut Treasury,
        pool:    &mut StakingPool,
        cfg:     &ProtocolConfig,
        ctx:     &mut TxContext,
    ) {
        assert!(lc.status == STATUS_CREATED, E_WRONG_STATUS);
        assert!(ctx.sender() == lc.buyer, E_NOT_BUYER);
        assert!(coin.value() == lc.amount, E_WRONG_AMOUNT);
        protocol_config::assert_not_paused(cfg);

        // Treasury stakes SUI via Haedal and stores haSUI
        treasury::stake_sui(treasury, pool, coin, ctx);

        lc.status = STATUS_FUNDED;
        event::emit(LCFunded { lc_id: object::id(lc), currency: CURRENCY_SUI });
    }

    // ── Fund: USDC path ───────────────────────────────────────────────────────

    public fun fund_usdc(
        lc:      &mut LetterOfCredit,
        coin:    Coin<USDC>,
        treasury: &mut Treasury,
        pool:    &mut LendingPool<USDC>,
        cfg:     &ProtocolConfig,
        ctx:     &mut TxContext,
    ) {
        assert!(lc.status == STATUS_CREATED, E_WRONG_STATUS);
        assert!(ctx.sender() == lc.buyer, E_NOT_BUYER);
        assert!(coin.value() == lc.amount, E_WRONG_AMOUNT);
        assert!(lc.currency == CURRENCY_USDC, E_WRONG_AMOUNT);
        protocol_config::assert_not_paused(cfg);

        treasury::stake_usdc(treasury, pool, coin, ctx);

        lc.status = STATUS_FUNDED;
        event::emit(LCFunded { lc_id: object::id(lc), currency: CURRENCY_USDC });
    }

    // ── Set recovery address ──────────────────────────────────────────────────

    public fun set_recovery_address(lc: &mut LetterOfCredit, addr: address, ctx: &TxContext) {
        assert!(ctx.sender() == lc.buyer, E_NOT_BUYER);
        lc.recovery_address = option::some(addr);
    }

    // ── Confirm shipment (seller) ─────────────────────────────────────────────

    public fun confirm_shipment(
        lc:       &mut LetterOfCredit,
        goods_description: String,
        shipment_ref:      String,
        clock:    &Clock,
        treasury: &mut Treasury,
        cfg:      &ProtocolConfig,
        ctx:      &mut TxContext,
    ) {
        assert!(lc.status == STATUS_FUNDED, E_WRONG_STATUS);
        assert!(ctx.sender() == lc.seller, E_NOT_SELLER);
        assert!(clock::timestamp_ms(clock) <= lc.ship_deadline_ms, E_ALREADY_EXPIRED);

        let nft = pickup_nft::mint(object::id(lc), goods_description, lc.seller, lc.buyer, ctx);
        let nft_id = object::id(&nft);

        // Pay seller immediately from treasury buffer
        if (lc.currency == CURRENCY_SUI) {
            treasury::payout_sui(treasury, cfg, lc.amount, lc.seller, ctx);
        } else {
            treasury::payout_usdc(treasury, cfg, lc.amount, lc.seller, ctx);
        };

        let nft_recipient = if (option::is_some(&lc.recovery_address)) {
            *option::borrow(&lc.recovery_address)
        } else {
            lc.buyer
        };
        transfer::public_transfer(nft, nft_recipient);

        lc.shipment_ref = option::some(shipment_ref);
        lc.status = STATUS_SETTLED;
        event::emit(GoodsShipped { lc_id: object::id(lc), nft_id });
    }

    // ── Complete pickup ───────────────────────────────────────────────────────

    /// Buyer presents NFT to verify pickup. Yield already distributed via replenish.
    public fun complete_pickup(
        lc:  &mut LetterOfCredit,
        nft: &mut PickupNFT,
        _treasury: &Treasury,
        _cfg:      &ProtocolConfig,
        _ctx:      &mut TxContext,
    ) {
        assert!(lc.status == STATUS_SETTLED, E_WRONG_STATUS);
        assert!(pickup_nft::lc_id(nft) == object::id(lc), E_WRONG_STATUS);
        pickup_nft::verify_and_use(nft);
        lc.status = STATUS_COMPLETED;
        event::emit(LCCompleted { lc_id: object::id(lc) });
    }

    // ── Buyer reclaim after seller default ────────────────────────────────────

    public fun buyer_reclaim(
        lc:       &mut LetterOfCredit,
        clock:    &Clock,
        treasury: &mut Treasury,
        cfg:      &ProtocolConfig,
        ctx:      &mut TxContext,
    ) {
        assert!(lc.status == STATUS_FUNDED, E_WRONG_STATUS);
        assert!(ctx.sender() == lc.buyer, E_NOT_BUYER);
        assert!(clock::timestamp_ms(clock) > lc.ship_deadline_ms, E_NOT_EXPIRED);

        if (lc.currency == CURRENCY_SUI) {
            treasury::payout_sui(treasury, cfg, lc.amount, lc.buyer, ctx);
        } else {
            treasury::payout_usdc(treasury, cfg, lc.amount, lc.buyer, ctx);
        };
        lc.status = STATUS_SELLER_DEFAULT;
    }

    // ── Raise dispute ─────────────────────────────────────────────────────────

    public fun raise_dispute(lc: &mut LetterOfCredit, evidence_hash: vector<u8>, ctx: &TxContext) {
        assert!(lc.status == STATUS_SETTLED, E_WRONG_STATUS);
        let sender = ctx.sender();
        assert!(sender == lc.buyer || sender == lc.seller, E_NOT_PARTY);
        lc.dispute_evidence_hash = option::some(evidence_hash);
        lc.status = STATUS_DISPUTED;
        event::emit(LCDisputed { lc_id: object::id(lc), raised_by: sender });
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public fun admin_resolve(
        _:        &AdminCap,
        lc:       &mut LetterOfCredit,
        pay_to_buyer: bool,
        treasury: &mut Treasury,
        cfg:      &ProtocolConfig,
        ctx:      &mut TxContext,
    ) {
        assert!(lc.status == STATUS_DISPUTED, E_WRONG_STATUS);
        let winner = if (pay_to_buyer) { lc.buyer } else { lc.seller };
        if (lc.currency == CURRENCY_SUI) {
            treasury::payout_sui(treasury, cfg, lc.amount, winner, ctx);
        } else {
            treasury::payout_usdc(treasury, cfg, lc.amount, winner, ctx);
        };
        lc.status = STATUS_REFUNDED;
        event::emit(LCResolved { lc_id: object::id(lc), winner });
    }

    public fun admin_extend_deadline(_: &AdminCap, lc: &mut LetterOfCredit, extra_ms: u64) {
        lc.ship_deadline_ms = lc.ship_deadline_ms + extra_ms;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun status(lc: &LetterOfCredit): u8      { lc.status }
    public fun buyer(lc: &LetterOfCredit): address   { lc.buyer }
    public fun seller(lc: &LetterOfCredit): address  { lc.seller }
    public fun amount(lc: &LetterOfCredit): u64      { lc.amount }
    public fun currency(lc: &LetterOfCredit): u8     { lc.currency }
}
