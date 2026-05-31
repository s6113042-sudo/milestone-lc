module test_coins::usdc {
    use sui::coin::{Self, TreasuryCap};

    public struct USDC has drop {}

    fun init(witness: USDC, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"USDC",
            b"USD Coin",
            b"Test USDC for devnet development",
            option::none(),
            ctx,
        );
        transfer::public_transfer(treasury_cap, ctx.sender());
        transfer::public_freeze_object(metadata);
    }

    public fun mint(
        cap: &mut TreasuryCap<USDC>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        coin::mint_and_transfer(cap, amount, recipient, ctx);
    }
}
