// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract DeOpenRouterMarketplaceTest is Test {
    DeOpenRouterMarketplace public m;

    receive() external payable {}

    function _reg(string memory modelId, string memory endpoint, uint256 pricePerCall) internal pure returns (DeOpenRouterMarketplace.ProviderRegistration memory) {
        return DeOpenRouterMarketplace.ProviderRegistration({
            modelId: modelId,
            endpoint: endpoint,
            pricePerCall: pricePerCall,
            metadataURI: "ipfs://QmExample",
            metadataHash: keccak256("metadata"),
            identityHash: keccak256("identity")
        });
    }

    function setUp() public {
        m = new DeOpenRouterMarketplace();
    }

    function test_register_reverts_below_min_stake() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidStake.selector);
        m.register{value: 0}(_reg("m1", "http://localhost:8787", 1 ether));
    }

    function test_register_emits_and_increments() public {
        vm.deal(address(this), 10 ether);
        uint256 min = m.MIN_STAKE();
        DeOpenRouterMarketplace.ProviderRegistration memory info = _reg("m1", "http://localhost:8787", 1 ether);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderRegistered(
            0,
            address(this),
            "m1",
            "http://localhost:8787",
            1 ether,
            min,
            "ipfs://QmExample",
            keccak256("metadata"),
            keccak256("identity"),
            block.number
        );
        m.register{value: min}(info);
        assertEq(m.nextProviderId(), 1);
        (
            address owner,
            ,
            ,
            ,
            uint256 stake,
            bool active,
            string memory uri,
            bytes32 mh,
            bytes32 ih,
            uint256 created,
            uint256 updated,
            uint256 slashedTot,
            uint256 lastSlash
        ) = m.providers(0);
        assertEq(owner, address(this));
        assertEq(stake, min);
        assertTrue(active);
        assertEq(uri, "ipfs://QmExample");
        assertEq(mh, keccak256("metadata"));
        assertEq(ih, keccak256("identity"));
        assertEq(created, block.number);
        assertEq(updated, block.number);
        assertEq(slashedTot, 0);
        assertEq(lastSlash, 0);
    }

    function test_invoke_reverts_inactive() public {
        vm.deal(address(this), 20 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        m.deactivate(0);
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.invoke{value: 2 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)), 1, 1);
    }

    function test_invoke_pays_owner_and_records() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.stopPrank();
        address userAlice = address(0xA11CE);
        vm.deal(userAlice, 5 ether);
        vm.startPrank(userAlice);
        bytes32 rq = keccak256("req");
        bytes32 rs = keccak256("res");
        assertEq(m.nextCallId(), 0);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.CallRecorded(0, userAlice, rq, rs, 1 ether, 0, 1, 1);
        m.invoke{value: 2 ether}(0, rq, rs, 1, 1);
        vm.stopPrank();
        assertEq(m.nextCallId(), 1);
        assertEq(userAlice.balance, 4 ether);
        assertEq(ownerBob.balance, 20 ether - m.MIN_STAKE() + 1 ether);
    }

    function test_invoke_reverts_payment_too_low() public {
        vm.deal(address(this), 20 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 2 ether));
        vm.expectRevert(DeOpenRouterMarketplace.PaymentTooLow.selector);
        m.invoke{value: 1 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)), 1, 1);
    }

    function test_deactivate_reverts_not_owner() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.stopPrank();
        vm.expectRevert(DeOpenRouterMarketplace.NotOwner.selector);
        m.deactivate(0);
    }

    function test_withdraw_stake_after_deactivate() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        uint256 min = m.MIN_STAKE();
        vm.startPrank(ownerBob);
        m.register{value: min}(_reg("m1", "http://x", 1 ether));
        m.deactivate(0);
        uint256 beforeBalance = ownerBob.balance;
        m.withdrawStake(0);
        vm.stopPrank();
        assertEq(ownerBob.balance, beforeBalance + min);
        (,,,, uint256 stakeAfter,,,,,,,,) = m.providers(0);
        assertEq(stakeAfter, 0);
    }

    function test_withdraw_reverts_when_stake_already_zero() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        m.deactivate(0);
        m.withdrawStake(0);
        vm.expectRevert(DeOpenRouterMarketplace.InvalidStake.selector);
        m.withdrawStake(0);
        vm.stopPrank();
    }

    function test_withdraw_reverts_while_active() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.withdrawStake(0);
        vm.stopPrank();
    }

    function test_update_provider_metadata() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        bytes32 newMh = keccak256("new-meta");
        bytes32 newIh = keccak256("new-id");
        DeOpenRouterMarketplace.ProviderMetadataUpdate memory upd = DeOpenRouterMarketplace.ProviderMetadataUpdate({
            metadataURI: "ipfs://updated",
            metadataHash: newMh,
            identityHash: newIh
        });
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderMetadataUpdated(0, "ipfs://updated", newMh, newIh, block.number);
        m.updateProviderMetadata(0, upd);
        (,,,,,, string memory uri, bytes32 mh, bytes32 ih,, uint256 updated,,) = m.providers(0);
        assertEq(uri, "ipfs://updated");
        assertEq(mh, newMh);
        assertEq(ih, newIh);
        assertEq(updated, block.number);
    }

    function test_update_metadata_reverts_not_owner() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.stopPrank();
        DeOpenRouterMarketplace.ProviderMetadataUpdate memory upd = DeOpenRouterMarketplace.ProviderMetadataUpdate({
            metadataURI: "x",
            metadataHash: bytes32(uint256(1)),
            identityHash: bytes32(uint256(2))
        });
        vm.expectRevert(DeOpenRouterMarketplace.NotOwner.selector);
        m.updateProviderMetadata(0, upd);
    }

    function test_slash_reduces_stake_and_pays_operator() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.stopPrank();
        address op = m.slashOperator();
        uint256 opBefore = op.balance;
        bytes32 reason = keccak256("fraud");
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderSlashed(0, op, 0.005 ether, reason, m.MIN_STAKE() - 0.005 ether);
        m.slash(0, 0.005 ether, reason);
        assertEq(op.balance, opBefore + 0.005 ether);
        (
            ,
            ,
            ,
            ,
            uint256 stake,
            ,
            ,
            ,
            ,
            ,
            ,
            uint256 slashedTot,
            uint256 lastSlash
        ) = m.providers(0);
        assertEq(stake, m.MIN_STAKE() - 0.005 ether);
        assertEq(slashedTot, 0.005 ether);
        assertEq(lastSlash, block.number);
    }

    function test_slash_reverts_not_operator() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.startPrank(address(0xDEAD));
        vm.expectRevert(DeOpenRouterMarketplace.NotSlashOperator.selector);
        m.slash(0, 1, bytes32(0));
        vm.stopPrank();
    }

    function test_slash_reverts_exceeds_stake() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", "http://x", 1 ether));
        vm.stopPrank();
        uint256 tooMuch = m.MIN_STAKE() + 1;
        vm.expectRevert(DeOpenRouterMarketplace.SlashExceedsStake.selector);
        m.slash(0, tooMuch, bytes32(0));
    }

    function test_transfer_slash_operator() public {
        address newOp = address(0xCAFE);
        m.transferSlashOperator(newOp);
        assertEq(m.slashOperator(), newOp);
    }
}
