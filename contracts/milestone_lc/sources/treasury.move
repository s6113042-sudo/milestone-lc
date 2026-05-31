/// Treasury: immediate-payout liquidity buffer + yield position manager.
module milestone_lc::treasury {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use mock_haedal::staking::{Self as haedal, HASUI, StakingPool};
    use mock_scallop::lending::{Self as scallop, SCOIN, LendingPool};
    use test_coins::usdc::USDC;
    use milestone_lc::protocol_config::{AdminCap, ProtocolConfig};
    use milestone_lc::protocol_config;

    // ── Treasury object ───────────────────────────────────────────────────────

    public struct Treasury has key {
        id: UID,
        sui_buffer:        Balance<SUI>,
        hasui_balance:     Balance<HASUI>,
        usdc_buffer:       Balance<USDC>,
        scoin_balance:     Balance<SCOIN>,
        protocol_fee_sui:  Balance<SUI>,
        protocol_fee_usdc: Balance<USDC>,
        pending_sui:  u64,
        pending_usdc: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct Payout has copy, drop {
        recipient: address, amount: u64, currency: u8
    }
    public struct Replenished has copy, drop {
        sui_redeemed: u64, usdc_redeemed: u64
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Treasury {
            id: object::new(ctx),
            sui_buffer:        balance::zero(),
            hasui_balance:     balance::zero(),
            usdc_buffer:       balance::zero(),
            scoin_balance:     balance::zero(),
            protocol_fee_sui:  balance::zero(),
            protocol_fee_usdc: balance::zero(),
            pending_sui:  0,
            pending_usdc: 0,
        });
    }

    // ── Stake ─────────────────────────────────────────────────────────────────

    public(package) fun stake_sui(
        treasury: &mut Treasury,
        pool:     &mut StakingPool,
        coin:     Coin<SUI>,
        ctx:      &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        let hasui  = haedal::stake(pool, coin, ctx);
        balance::join(&mut treasury.hasui_balance, hasui);
        treasury.pending_sui = treasury.pending_sui + amount;
    }

    public(package) fun stake_usdc(
        treasury: &mut Treasury,
        pool:     &mut LendingPool<USDC>,
        coin:     Coin<USDC>,
        ctx:      &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        let scoin  = scallop::deposit(pool, coin, ctx);
        balance::join(&mut treasury.scoin_balance, scoin);
        treasury.pending_usdc = treasury.pending_usdc + amount;
    }

    // ── Immediate payout ──────────────────────────────────────────────────────

    public(package) fun payout_sui(
        treasury: &mut Treasury,
        cfg:      &ProtocolConfig,
        amount:   u64,
        recipient: address,
        ctx:      &mut TxContext,
    ) {
        protocol_config::assert_not_paused(cfg);
        assert!(balance::value(&treasury.sui_buffer) >= amount, 0);
        let payout = coin::take(&mut treasury.sui_buffer, amount, ctx);
        transfer::public_transfer(payout, recipient);
        event::emit(Payout { recipient, amount, currency: 0 });
    }

    public(package) fun payout_usdc(
        treasury: &mut Treasury,
        cfg:      &ProtocolConfig,
        amount:   u64,
        recipient: address,
        ctx:      &mut TxContext,
    ) {
        protocol_config::assert_not_paused(cfg);
        assert!(balance::value(&treasury.usdc_buffer) >= amount, 1);
        let payout = coin::take(&mut treasury.usdc_buffer, amount, ctx);
        transfer::public_transfer(payout, recipient);
        event::emit(Payout { recipient, amount, currency: 1 });
    }

    // ── Replenish: redeem all yield positions ─────────────────────────────────

    /// Redeems all haSUI → SUI + yield.
    /// Returns buyer_yield (70% of yield after protocol fee).
    public fun replenish_sui(
        treasury: &mut Treasury,
        pool:     &mut StakingPool,
        cfg:      &ProtocolConfig,
        ctx:      &mut TxContext,
    ): u64 {
        protocol_config::assert_not_paused(cfg);
        let hasui_held = balance::value(&treasury.hasui_balance);
        if (hasui_held == 0) return 0;

        let hasui = balance::split(&mut treasury.hasui_balance, hasui_held);
        let sui_back   = haedal::unstake(pool, hasui, ctx);
        let total_back = coin::value(&sui_back);

        let principal   = treasury.pending_sui;
        let yield_total = if (total_back > principal) { total_back - principal } else { 0 };
        let fee_bps     = protocol_config::fee_bps(cfg);
        let protocol_share = yield_total * fee_bps / 10000;
        let buyer_yield    = yield_total - protocol_share;

        let mut sui_bal = coin::into_balance(sui_back);
        if (protocol_share > 0) {
            let fee = balance::split(&mut sui_bal, protocol_share);
            balance::join(&mut treasury.protocol_fee_sui, fee);
        };
        balance::join(&mut treasury.sui_buffer, sui_bal);

        treasury.pending_sui = 0;
        event::emit(Replenished { sui_redeemed: total_back, usdc_redeemed: 0 });
        buyer_yield
    }

    /// Redeems all sCoin → USDC + yield.
    public fun replenish_usdc(
        treasury: &mut Treasury,
        pool:     &mut LendingPool<USDC>,
        cfg:      &ProtocolConfig,
        ctx:      &mut TxContext,
    ): u64 {
        protocol_config::assert_not_paused(cfg);
        let scoin_held = balance::value(&treasury.scoin_balance);
        if (scoin_held == 0) return 0;

        let scoin    = balance::split(&mut treasury.scoin_balance, scoin_held);
        let usdc_back = scallop::withdraw(pool, scoin, ctx);
        let total_back = coin::value(&usdc_back);

        let principal   = treasury.pending_usdc;
        let yield_total = if (total_back > principal) { total_back - principal } else { 0 };
        let fee_bps     = protocol_config::fee_bps(cfg);
        let protocol_share = yield_total * fee_bps / 10000;
        let buyer_yield    = yield_total - protocol_share;

        let mut usdc_bal = coin::into_balance(usdc_back);
        if (protocol_share > 0) {
            let fee = balance::split(&mut usdc_bal, protocol_share);
            balance::join(&mut treasury.protocol_fee_usdc, fee);
        };
        balance::join(&mut treasury.usdc_buffer, usdc_bal);

        treasury.pending_usdc = 0;
        event::emit(Replenished { sui_redeemed: 0, usdc_redeemed: total_back });
        buyer_yield
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public fun deposit_sui_buffer(_: &AdminCap, treasury: &mut Treasury, coin: Coin<SUI>) {
        balance::join(&mut treasury.sui_buffer, coin::into_balance(coin));
    }

    public fun deposit_usdc_buffer(_: &AdminCap, treasury: &mut Treasury, coin: Coin<USDC>) {
        balance::join(&mut treasury.usdc_buffer, coin::into_balance(coin));
    }

    public fun withdraw_fee_sui(_: &AdminCap, treasury: &mut Treasury, ctx: &mut TxContext): Coin<SUI> {
        let amount = balance::value(&treasury.protocol_fee_sui);
        coin::take(&mut treasury.protocol_fee_sui, amount, ctx)
    }

    public fun withdraw_fee_usdc(_: &AdminCap, treasury: &mut Treasury, ctx: &mut TxContext): Coin<USDC> {
        let amount = balance::value(&treasury.protocol_fee_usdc);
        coin::take(&mut treasury.protocol_fee_usdc, amount, ctx)
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun sui_buffer(t: &Treasury): u64      { balance::value(&t.sui_buffer) }
    public fun usdc_buffer(t: &Treasury): u64     { balance::value(&t.usdc_buffer) }
    public fun pending_sui(t: &Treasury): u64     { t.pending_sui }
    public fun pending_usdc(t: &Treasury): u64    { t.pending_usdc }
    public fun hasui_held(t: &Treasury): u64      { balance::value(&t.hasui_balance) }
    public fun scoin_held(t: &Treasury): u64      { balance::value(&t.scoin_balance) }
    public fun protocol_fee_sui(t: &Treasury): u64  { balance::value(&t.protocol_fee_sui) }
    public fun protocol_fee_usdc(t: &Treasury): u64 { balance::value(&t.protocol_fee_usdc) }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }
}
