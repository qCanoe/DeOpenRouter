// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract DeOpenRouterMarketplaceTest is Test {
    DeOpenRouterMarketplace public m;

    function setUp() public {
        m = new DeOpenRouterMarketplace();
    }

    function test_register_reverts_below_min_stake() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidStake.selector);
        m.register{value: 0}("m1", "http://localhost:8787", 1 ether);
    }

    function test_register_emits_and_increments() public {
        vm.deal(address(this), 10 ether);
        uint256 min = m.MIN_STAKE();
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderRegistered(0, address(this), "m1", "http://localhost:8787", 1 ether, min);
        m.register{value: min}("m1", "http://localhost:8787", 1 ether);
        assertEq(m.nextProviderId(), 1);
        (address owner,,,, uint256 stake, bool active) = m.providers(0);
        assertEq(owner, address(this));
        assertEq(stake, min);
        assertTrue(active);
    }

    function test_invoke_reverts_inactive() public {
        vm.deal(address(this), 20 ether);
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 1 ether);
        m.deactivate(0);
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.invoke{value: 2 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)));
    }

    function test_invoke_pays_owner_and_records() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 1 ether);
        vm.stopPrank();
        address userAlice = address(0xA11CE);
        vm.deal(userAlice, 5 ether);
        vm.startPrank(userAlice);
        bytes32 rq = keccak256("req");
        bytes32 rs = keccak256("res");
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.CallRecorded(0, userAlice, rq, rs, 1 ether);
        m.invoke{value: 2 ether}(0, rq, rs);
        vm.stopPrank();
        assertEq(userAlice.balance, 4 ether);
        assertEq(ownerBob.balance, 20 ether - m.MIN_STAKE() + 1 ether);
    }

    function test_invoke_reverts_payment_too_low() public {
        vm.deal(address(this), 20 ether);
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 2 ether);
        vm.expectRevert(DeOpenRouterMarketplace.PaymentTooLow.selector);
        m.invoke{value: 1 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)));
    }

    function test_deactivate_reverts_not_owner() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 1 ether);
        vm.stopPrank();
        vm.expectRevert(DeOpenRouterMarketplace.NotOwner.selector);
        m.deactivate(0);
    }

    function test_withdraw_stake_after_deactivate() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        uint256 min = m.MIN_STAKE();
        vm.startPrank(ownerBob);
        m.register{value: min}("m1", "http://x", 1 ether);
        m.deactivate(0);
        uint256 beforeBalance = ownerBob.balance;
        m.withdrawStake(0);
        vm.stopPrank();
        assertEq(ownerBob.balance, beforeBalance + min);
        (,,,, uint256 stakeAfter,) = m.providers(0);
        assertEq(stakeAfter, 0);
    }

    function test_withdraw_reverts_when_stake_already_zero() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 1 ether);
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
        m.register{value: m.MIN_STAKE()}("m1", "http://x", 1 ether);
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.withdrawStake(0);
        vm.stopPrank();
    }
}
