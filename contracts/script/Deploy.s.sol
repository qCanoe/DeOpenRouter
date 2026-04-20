// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        // priceDelayBlocks, slashChallengePeriodBlocks (e.g. ~100 blocks challenge window on Anvil)
        new DeOpenRouterMarketplace(100, 100);
        vm.stopBroadcast();
    }
}
