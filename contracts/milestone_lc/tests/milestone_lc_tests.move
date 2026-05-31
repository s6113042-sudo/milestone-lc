#[test_only]
module milestone_lc::lc_tests {
    use std::string;
    use sui::coin;
    use sui::sui::SUI;
    use sui::clock;
    use sui::test_scenario::{Self as ts, Scenario};
    use mock_haedal::staking::{Self as haedal, StakingPool};
    use milestone_lc::protocol_config::{Self, AdminCap, ProtocolConfig};
    use milestone_lc::treasury::{Self, Treasury};
    use milestone_lc::lc_core::{Self, LetterOfCredit};
    use milestone_lc::pickup_nft::{Self, PickupNFT};

    // ── Test addresses ────────────────────────────────────────────────────────

    const ADMIN:  address = @0xA;
    const BUYER:  address = @0xB;
    const SELLER: address = @0xC;

    // ── Setup ─────────────────────────────────────────────────────────────────

    fun setup(): Scenario {
        let mut scenario = ts::begin(ADMIN);

        { ts::next_tx(&mut scenario, ADMIN); protocol_config::init_for_testing(ts::ctx(&mut scenario)); };
        { ts::next_tx(&mut scenario, ADMIN); treasury::init_for_testing(ts::ctx(&mut scenario)); };
        { ts::next_tx(&mut scenario, ADMIN); haedal::init_for_testing(ts::ctx(&mut scenario)); };

        // Top-up treasury SUI buffer so it can pay sellers immediately
        {
            ts::next_tx(&mut scenario, ADMIN);
            let cap    = ts::take_from_sender<AdminCap>(&scenario);
            let mut tr = ts::take_shared<Treasury>(&scenario);
            let ctx    = ts::ctx(&mut scenario);
            let seed   = coin::mint_for_testing<SUI>(100_000_000_000, ctx);
            treasury::deposit_sui_buffer(&cap, &mut tr, seed);
            ts::return_shared(tr);
            ts::return_to_sender(&scenario, cap);
        };

        scenario
    }

    fun make_clock(ts_ms: u64, ctx: &mut sui::tx_context::TxContext): clock::Clock {
        let mut clk = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clk, ts_ms);
        clk
    }

    // ── Test 1: happy path ────────────────────────────────────────────────────

    #[test]
    fun test_full_lc_lifecycle() {
        let mut scenario = setup();

        // Create L/C
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 10_000_000_000, 0, b"hash", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };

        // Fund with SUI
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg      = ts::take_shared<ProtocolConfig>(&scenario);
            let mut tr   = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario);
            let mut lc   = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx      = ts::ctx(&mut scenario);
            let coin     = coin::mint_for_testing<SUI>(10_000_000_000, ctx);
            lc_core::fund_sui(&mut lc, coin, &mut tr, &mut pool, &cfg, ctx);
            assert!(lc_core::status(&lc) == 1);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };

        // Seller confirms shipment
        {
            ts::next_tx(&mut scenario, SELLER);
            let cfg      = ts::take_shared<ProtocolConfig>(&scenario);
            let mut tr   = ts::take_shared<Treasury>(&scenario);
            let mut lc   = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx      = ts::ctx(&mut scenario);
            let clk      = make_clock(1_000, ctx);
            lc_core::confirm_shipment(&mut lc, string::utf8(b"goods"), string::utf8(b"SF-1"), &clk, &mut tr, &cfg, ctx);
            assert!(lc_core::status(&lc) == 2);
            clock::destroy_for_testing(clk);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };

        // Buyer completes pickup
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg    = ts::take_shared<ProtocolConfig>(&scenario);
            let tr     = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let mut nft = ts::take_from_sender<PickupNFT>(&scenario);
            let ctx    = ts::ctx(&mut scenario);
            lc_core::complete_pickup(&mut lc, &mut nft, &tr, &cfg, ctx);
            assert!(lc_core::status(&lc) == 3);
            assert!(pickup_nft::is_used(&nft) == true);
            ts::return_to_sender(&scenario, nft);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }

    // ── Test 2: buyer reclaim after deadline ──────────────────────────────────

    #[test]
    fun test_buyer_reclaim_after_deadline() {
        let mut scenario = setup();

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 5_000_000_000, 0, b"h", 500, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg      = ts::take_shared<ProtocolConfig>(&scenario);
            let mut tr   = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario);
            let mut lc   = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx      = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(5_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg    = ts::take_shared<ProtocolConfig>(&scenario);
            let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx    = ts::ctx(&mut scenario);
            let clk    = make_clock(1_000, ctx); // > deadline 500
            lc_core::buyer_reclaim(&mut lc, &clk, &mut tr, &cfg, ctx);
            assert!(lc_core::status(&lc) == 4);
            clock::destroy_for_testing(clk);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }

    // ── Test 3: dispute → admin resolves to buyer ─────────────────────────────

    #[test]
    fun test_dispute_and_admin_resolve() {
        let mut scenario = setup();

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 3_000_000_000, 0, b"h", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario); let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(3_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, SELLER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario); let ctx = ts::ctx(&mut scenario);
            let clk = make_clock(1, ctx);
            lc_core::confirm_shipment(&mut lc, string::utf8(b"g"), string::utf8(b"r"), &clk, &mut tr, &cfg, ctx);
            clock::destroy_for_testing(clk);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            lc_core::raise_dispute(&mut lc, b"ev", ts::ctx(&mut scenario));
            assert!(lc_core::status(&lc) == 5);
            ts::return_shared(lc);
        };
        {
            ts::next_tx(&mut scenario, ADMIN);
            let cap = ts::take_from_sender<AdminCap>(&scenario);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            lc_core::admin_resolve(&cap, &mut lc, true, &mut tr, &cfg, ts::ctx(&mut scenario));
            assert!(lc_core::status(&lc) == 6);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }

    // ── Test 4: NFT to recovery address ──────────────────────────────────────

    #[test]
    fun test_nft_to_recovery_address() {
        let mut scenario = setup();
        let recovery: address = @0xD;

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 2_000_000_000, 0, b"h", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario); let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(2_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            lc_core::set_recovery_address(&mut lc, recovery, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, SELLER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario); let ctx = ts::ctx(&mut scenario);
            let clk = make_clock(1, ctx);
            lc_core::confirm_shipment(&mut lc, string::utf8(b"g"), string::utf8(b"r"), &clk, &mut tr, &cfg, ctx);
            clock::destroy_for_testing(clk);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, recovery);
            let nft = ts::take_from_sender<PickupNFT>(&scenario);
            assert!(pickup_nft::is_used(&nft) == false);
            ts::return_to_sender(&scenario, nft);
        };

        ts::end(scenario);
    }

    // ── Test 5: haedal yield flows through replenish ──────────────────────────

    #[test]
    fun test_yield_accrues_after_replenish() {
        let mut scenario = setup();

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 10_000_000_000, 0, b"h", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario); let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(10_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };

        // Inject 1 SUI yield into Haedal pool (simulates staking rewards)
        {
            ts::next_tx(&mut scenario, ADMIN);
            let mut pool = ts::take_shared<StakingPool>(&scenario);
            let yield_coin = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(&mut scenario));
            haedal::inject_yield(&mut pool, yield_coin);
            ts::return_shared(pool);
        };

        // Admin triggers replenish: redeems haSUI → 11 SUI, 0.7 SUI to buyer yield, 0.3 SUI protocol fee
        {
            ts::next_tx(&mut scenario, ADMIN);
            let cfg    = ts::take_shared<ProtocolConfig>(&scenario);
            let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario);
            let buyer_yield = treasury::replenish_sui(&mut tr, &mut pool, &cfg, ts::ctx(&mut scenario));
            // 30% of 1 SUI = 0.3 SUI protocol fee, 0.7 SUI to buyers
            assert!(buyer_yield == 700_000_000);
            assert!(treasury::protocol_fee_sui(&tr) == 300_000_000);
            ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }

    // ── Test 6: cannot fund twice ─────────────────────────────────────────────

    #[test]
    #[expected_failure(abort_code = 1)] // E_WRONG_STATUS
    fun test_cannot_fund_twice() {
        let mut scenario = setup();

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 1_000_000_000, 0, b"h", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario); let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(1_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(1_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }

    // ── Test 7: only seller can ship ──────────────────────────────────────────

    #[test]
    #[expected_failure(abort_code = 3)] // E_NOT_SELLER
    fun test_only_seller_can_ship() {
        let mut scenario = setup();

        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario);
            lc_core::create(SELLER, 1_000_000_000, 0, b"h", 9_999_999_999_999, 9_999_999_999_999, &cfg, ts::ctx(&mut scenario));
            ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER);
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut pool = ts::take_shared<StakingPool>(&scenario); let mut lc = ts::take_shared<LetterOfCredit>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            lc_core::fund_sui(&mut lc, coin::mint_for_testing<SUI>(1_000_000_000, ctx), &mut tr, &mut pool, &cfg, ctx);
            ts::return_shared(lc); ts::return_shared(pool); ts::return_shared(tr); ts::return_shared(cfg);
        };
        {
            ts::next_tx(&mut scenario, BUYER); // wrong sender
            let cfg = ts::take_shared<ProtocolConfig>(&scenario); let mut tr = ts::take_shared<Treasury>(&scenario);
            let mut lc = ts::take_shared<LetterOfCredit>(&scenario); let ctx = ts::ctx(&mut scenario);
            let clk = make_clock(1, ctx);
            lc_core::confirm_shipment(&mut lc, string::utf8(b"x"), string::utf8(b"y"), &clk, &mut tr, &cfg, ctx);
            clock::destroy_for_testing(clk);
            ts::return_shared(lc); ts::return_shared(tr); ts::return_shared(cfg);
        };

        ts::end(scenario);
    }
}
