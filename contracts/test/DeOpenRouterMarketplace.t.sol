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
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderRegistered(
            0,
            address(this),
            "m1",
            "http://localhost:8787",
            1 ether,
            DeOpenRouterMarketplace.MIN_STAKE()
        );
        m.register{value: DeOpenRouterMarketplace.MIN_STAKE()}("m1", "http://localhost:8787", 1 ether);
        assertEq(m.nextProviderId(), 1);
        (address owner,,,, uint256 stake, bool active) = m.providers(0);
        assertEq(owner, address(this));
        assertEq(stake, DeOpenRouterMarketplace.MIN_STAKE());
        assertTrue(active);
    }
}
