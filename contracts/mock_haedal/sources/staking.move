/// Mock Haedal liquid staking — uses balance::Supply instead of TreasuryCap
/// to avoid OTW requirements in tests.
module mock_haedal::staking {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance, Supply};
    use sui::event;

    // ── haSUI marker type ─────────────────────────────────────────────────────

    public struct HASUI has store, drop {}

    // ── Pool ──────────────────────────────────────────────────────────────────

    public struct StakingPool has key {
        id: UID,
        sui_reserve:   Balance<SUI>,
        yield_reserve: Balance<SUI>,
        hasui_supply:  Supply<HASUI>,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct Staked has copy, drop   { staker: address, sui_in: u64, hasui_out: u64 }
    public struct Unstaked has copy, drop { staker: address, hasui_in: u64, sui_out: u64 }
    public struct YieldInjected has copy, drop { amount: u64 }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        transfer::share_object(StakingPool {
            id: object::new(ctx),
            sui_reserve:  balance::zero(),
            yield_reserve: balance::zero(),
            hasui_supply: balance::create_supply(HASUI {}),
        });
    }

    // ── Stake SUI → Balance<HASUI> ────────────────────────────────────────────

    public fun stake(
        pool: &mut StakingPool,
        sui:  Coin<SUI>,
        _ctx: &mut TxContext,
    ): Balance<HASUI> {
        let sui_in      = coin::value(&sui);
        let total_sui   = balance::value(&pool.sui_reserve) + balance::value(&pool.yield_reserve);
        let total_hasui = balance::supply_value(&pool.hasui_supply);

        let hasui_out = if (total_hasui == 0 || total_sui == 0) {
            sui_in
        } else {
            (((sui_in as u128) * (total_hasui as u128)) / (total_sui as u128)) as u64
        };

        balance::join(&mut pool.sui_reserve, coin::into_balance(sui));
        let hasui = balance::increase_supply(&mut pool.hasui_supply, hasui_out);
        event::emit(Staked { staker: @0x0, sui_in, hasui_out });
        hasui
    }

    // ── Unstake Balance<HASUI> → Coin<SUI> ───────────────────────────────────

    public fun unstake(
        pool:  &mut StakingPool,
        hasui: Balance<HASUI>,
        ctx:   &mut TxContext,
    ): Coin<SUI> {
        let hasui_in    = balance::value(&hasui);
        let total_hasui = balance::supply_value(&pool.hasui_supply);
        let total_sui   = balance::value(&pool.sui_reserve) + balance::value(&pool.yield_reserve);

        let sui_out = if (total_hasui == 0) { hasui_in } else {
            (((hasui_in as u128) * (total_sui as u128)) / (total_hasui as u128)) as u64
        };

        balance::decrease_supply(&mut pool.hasui_supply, hasui);

        let yield_avail   = balance::value(&pool.yield_reserve);
        let principal_out = if (sui_out > yield_avail) { sui_out - yield_avail } else { 0 };
        let yield_out     = sui_out - principal_out;

        let mut out = balance::split(&mut pool.sui_reserve, principal_out);
        if (yield_out > 0) {
            balance::join(&mut out, balance::split(&mut pool.yield_reserve, yield_out));
        };

        event::emit(Unstaked { staker: @0x0, hasui_in, sui_out });
        coin::from_balance(out, ctx)
    }

    // ── Admin: inject SUI yield ───────────────────────────────────────────────

    public fun inject_yield(pool: &mut StakingPool, yield_coin: Coin<SUI>) {
        let amount = coin::value(&yield_coin);
        balance::join(&mut pool.yield_reserve, coin::into_balance(yield_coin));
        event::emit(YieldInjected { amount });
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun total_sui(pool: &StakingPool): u64 {
        balance::value(&pool.sui_reserve) + balance::value(&pool.yield_reserve)
    }
    public fun total_hasui(pool: &StakingPool): u64 {
        balance::supply_value(&pool.hasui_supply)
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx); }
}
