/// Mock Scallop lending pool — uses balance::Supply instead of TreasuryCap.
module mock_scallop::lending {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance, Supply};
    use sui::event;

    // ── sCoin marker type ─────────────────────────────────────────────────────

    public struct SCOIN has store, drop {}

    // ── Pool ──────────────────────────────────────────────────────────────────

    public struct LendingPool<phantom T> has key {
        id: UID,
        reserve:       Balance<T>,
        yield_reserve: Balance<T>,
        scoin_supply:  Supply<SCOIN>,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct Deposited has copy, drop  { amount_in: u64, scoin_out: u64 }
    public struct Withdrawn has copy, drop  { scoin_in: u64, amount_out: u64 }
    public struct YieldInjected has copy, drop { amount: u64 }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        // Transfer a supply cap to the deployer; they call create_pool per asset.
        // For simplicity in mock, we create one shared supply.
        // Each asset gets its own LendingPool but shares the same SCOIN supply marker.
        let _ = ctx;
        // Supply created per-pool in create_pool.
    }

    // ── Create a lending pool for asset T ────────────────────────────────────

    public fun create_pool<T>(ctx: &mut TxContext) {
        transfer::share_object(LendingPool<T> {
            id: object::new(ctx),
            reserve:       balance::zero(),
            yield_reserve: balance::zero(),
            scoin_supply:  balance::create_supply(SCOIN {}),
        });
    }

    // ── Deposit Coin<T> → Balance<SCOIN> ─────────────────────────────────────

    public fun deposit<T>(
        pool:    &mut LendingPool<T>,
        coin:    Coin<T>,
        _ctx:    &mut TxContext,
    ): Balance<SCOIN> {
        let amount_in   = coin::value(&coin);
        let total_asset = balance::value(&pool.reserve) + balance::value(&pool.yield_reserve);
        let total_scoin = balance::supply_value(&pool.scoin_supply);

        let scoin_out = if (total_scoin == 0 || total_asset == 0) {
            amount_in
        } else {
            (((amount_in as u128) * (total_scoin as u128)) / (total_asset as u128)) as u64
        };

        balance::join(&mut pool.reserve, coin::into_balance(coin));
        let sc = balance::increase_supply(&mut pool.scoin_supply, scoin_out);
        event::emit(Deposited { amount_in, scoin_out });
        sc
    }

    // ── Withdraw Balance<SCOIN> → Coin<T> ────────────────────────────────────

    public fun withdraw<T>(
        pool:  &mut LendingPool<T>,
        scoin: Balance<SCOIN>,
        ctx:   &mut TxContext,
    ): Coin<T> {
        let scoin_in    = balance::value(&scoin);
        let total_scoin = balance::supply_value(&pool.scoin_supply);
        let total_asset = balance::value(&pool.reserve) + balance::value(&pool.yield_reserve);

        let amount_out = if (total_scoin == 0) { scoin_in } else {
            (((scoin_in as u128) * (total_asset as u128)) / (total_scoin as u128)) as u64
        };

        balance::decrease_supply(&mut pool.scoin_supply, scoin);

        let yield_avail   = balance::value(&pool.yield_reserve);
        let principal_out = if (amount_out > yield_avail) { amount_out - yield_avail } else { 0 };
        let yield_out     = amount_out - principal_out;

        let mut out = balance::split(&mut pool.reserve, principal_out);
        if (yield_out > 0) {
            balance::join(&mut out, balance::split(&mut pool.yield_reserve, yield_out));
        };

        event::emit(Withdrawn { scoin_in, amount_out });
        coin::from_balance(out, ctx)
    }

    // ── Admin: inject yield ───────────────────────────────────────────────────

    public fun inject_yield<T>(pool: &mut LendingPool<T>, yield_coin: Coin<T>) {
        let amount = coin::value(&yield_coin);
        balance::join(&mut pool.yield_reserve, coin::into_balance(yield_coin));
        event::emit(YieldInjected { amount });
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun total_asset<T>(pool: &LendingPool<T>): u64 {
        balance::value(&pool.reserve) + balance::value(&pool.yield_reserve)
    }
    public fun total_scoin<T>(pool: &LendingPool<T>): u64 {
        balance::supply_value(&pool.scoin_supply)
    }

    #[test_only]
    public fun create_pool_for_testing<T>(ctx: &mut TxContext) { create_pool<T>(ctx); }
}
