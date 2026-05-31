/// Protocol-wide configuration: admin address, fee rate, pause switch.
module milestone_lc::protocol_config {

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct ProtocolConfig has key {
        id: UID,
        admin: address,
        /// Basis points taken by the protocol from yield (3000 = 30%).
        protocol_fee_bps: u64,
        paused: bool,
    }

    const INITIAL_FEE_BPS: u64 = 3000;

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
        transfer::share_object(ProtocolConfig {
            id: object::new(ctx),
            admin: ctx.sender(),
            protocol_fee_bps: INITIAL_FEE_BPS,
            paused: false,
        });
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    public fun admin(cfg: &ProtocolConfig): address  { cfg.admin }
    public fun fee_bps(cfg: &ProtocolConfig): u64    { cfg.protocol_fee_bps }
    public fun is_paused(cfg: &ProtocolConfig): bool { cfg.paused }

    // ── Admin mutations ───────────────────────────────────────────────────────

    public fun set_fee_bps(_: &AdminCap, cfg: &mut ProtocolConfig, new_bps: u64) {
        assert!(new_bps <= 10000, 0);
        cfg.protocol_fee_bps = new_bps;
    }

    public fun set_paused(_: &AdminCap, cfg: &mut ProtocolConfig, paused: bool) {
        cfg.paused = paused;
    }

    public fun assert_not_paused(cfg: &ProtocolConfig) {
        assert!(!cfg.paused, 1);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
