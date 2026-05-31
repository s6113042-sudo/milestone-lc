/// PickupNFT: minted by seller on shipment confirmation, marked used at pickup.
module milestone_lc::pickup_nft {
    use std::string::String;
    use sui::event;
    use milestone_lc::protocol_config::AdminCap;

    public struct PickupNFT has key, store {
        id: UID,
        lc_id: ID,
        goods_description: String,
        seller: address,
        used: bool,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    public struct NFTMinted has copy, drop {
        nft_id: ID,
        lc_id: ID,
        seller: address,
        buyer: address,
    }

    public struct NFTUsed has copy, drop {
        nft_id: ID,
        lc_id: ID,
    }

    // ── Package-internal mint ─────────────────────────────────────────────────

    public(package) fun mint(
        lc_id: ID,
        goods_description: String,
        seller: address,
        buyer: address,
        ctx: &mut TxContext,
    ): PickupNFT {
        let nft = PickupNFT {
            id: object::new(ctx),
            lc_id,
            goods_description,
            seller,
            used: false,
        };
        event::emit(NFTMinted {
            nft_id: object::id(&nft),
            lc_id,
            seller,
            buyer,
        });
        nft
    }

    /// Mark NFT as used during pickup verification. Returns lc_id for confirmation.
    public fun verify_and_use(nft: &mut PickupNFT): ID {
        assert!(!nft.used, 0);
        nft.used = true;
        event::emit(NFTUsed { nft_id: object::id(nft), lc_id: nft.lc_id });
        nft.lc_id
    }

    /// Admin can transfer an NFT to a recovery address (wallet-loss scenario).
    public fun admin_transfer(_: &AdminCap, nft: PickupNFT, recipient: address) {
        transfer::public_transfer(nft, recipient);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun lc_id(nft: &PickupNFT): ID      { nft.lc_id }
    public fun is_used(nft: &PickupNFT): bool   { nft.used }
    public fun seller(nft: &PickupNFT): address { nft.seller }
}
