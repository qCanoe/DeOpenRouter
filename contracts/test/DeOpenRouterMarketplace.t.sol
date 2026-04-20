// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DeOpenRouterMarketplace.sol";

contract DeOpenRouterMarketplaceTest is Test {
    DeOpenRouterMarketplace public m;

    uint256 internal constant PRICE_DELAY = 5;
    uint256 internal constant SLASH_CHALLENGE_BLOCKS = 5;

    receive() external payable {}

    function _ep() internal pure returns (bytes32) {
        return keccak256("endpoint-id");
    }

    function _reg(string memory modelId, uint256 pricePerCall, uint256 stakeLockBlocks)
        internal
        pure
        returns (DeOpenRouterMarketplace.ProviderRegistration memory)
    {
        return DeOpenRouterMarketplace.ProviderRegistration({
            modelId: modelId,
            modelVersion: "1.0.0",
            endpointCommitment: keccak256("endpoint-id"),
            capabilityHash: keccak256("capabilities"),
            pricePerCall: pricePerCall,
            stakeLockBlocks: stakeLockBlocks,
            metadataURI: "ipfs://QmExample",
            metadataHash: keccak256("metadata"),
            identityHash: keccak256("identity")
        });
    }

    function setUp() public {
        m = new DeOpenRouterMarketplace(PRICE_DELAY, SLASH_CHALLENGE_BLOCKS);
    }

    function test_register_reverts_below_min_stake() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidStake.selector);
        m.register{value: 0}(_reg("m1", 1 ether, 0));
    }

    function test_register_reverts_zero_endpoint_commitment() public {
        vm.deal(address(this), 10 ether);
        uint256 min = m.MIN_STAKE();
        DeOpenRouterMarketplace.ProviderRegistration memory bad = _reg("m1", 1 ether, 0);
        bad.endpointCommitment = bytes32(0);
        vm.expectRevert(DeOpenRouterMarketplace.InvalidEndpointCommitment.selector);
        m.register{value: min}(bad);
    }

    function test_register_emits_and_increments() public {
        vm.deal(address(this), 10 ether);
        uint256 min = m.MIN_STAKE();
        DeOpenRouterMarketplace.ProviderRegistration memory info = _reg("m1", 1 ether, 0);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.ProviderRegistered(
            0,
            address(this),
            "m1",
            "1.0.0",
            _ep(),
            keccak256("capabilities"),
            1 ether,
            0,
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
            bytes32 ec,
            ,
            uint256 price,
            uint256 pend,
            uint256 pendBlock,
            uint256 stake,
            uint256 lockBlocks,
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
        assertEq(ec, _ep());
        assertEq(price, 1 ether);
        assertEq(pend, 0);
        assertEq(pendBlock, 0);
        assertEq(stake, min);
        assertEq(lockBlocks, 0);
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
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        m.deactivate(0);
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.invoke{value: 2 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)), 1, 1, 0);
    }

    function test_invoke_pays_owner_and_records() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        address userAlice = address(0xA11CE);
        vm.deal(userAlice, 5 ether);
        vm.startPrank(userAlice);
        bytes32 rq = keccak256("req");
        bytes32 rs = keccak256("res");
        assertEq(m.nextCallId(), 0);
        uint256 bn = block.number;
        uint256 ts = block.timestamp;
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.CallRecorded(
            0, userAlice, rq, rs, 1 ether, 0, 42, bn, ts, 1, 1, m.SETTLEMENT_SETTLED()
        );
        m.invoke{value: 2 ether}(0, rq, rs, 1, 1, 42);
        vm.stopPrank();
        assertEq(m.nextCallId(), 1);
        assertEq(userAlice.balance, 4 ether);
        assertEq(ownerBob.balance, 20 ether - m.MIN_STAKE() + 1 ether);
        (
            uint256 pid,
            address caller,
            bytes32 qh,
            bytes32 rh,
            uint256 paid,
            uint256 usage,
            uint256 recBlock,
            uint256 recAt,
            uint8 status
        ) = m.calls(0);
        assertEq(pid, 0);
        assertEq(caller, userAlice);
        assertEq(qh, rq);
        assertEq(rh, rs);
        assertEq(paid, 1 ether);
        assertEq(usage, 42);
        assertEq(recBlock, bn);
        assertEq(recAt, ts);
        assertEq(status, m.SETTLEMENT_SETTLED());
    }

    function test_invoke_reverts_payment_too_low() public {
        vm.deal(address(this), 20 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 2 ether, 0));
        vm.expectRevert(DeOpenRouterMarketplace.PaymentTooLow.selector);
        m.invoke{value: 1 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)), 1, 1, 0);
    }

    function test_deactivate_reverts_not_owner() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        vm.expectRevert(DeOpenRouterMarketplace.NotOwner.selector);
        m.deactivate(0);
    }

    function test_withdraw_stake_after_deactivate() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        uint256 min = m.MIN_STAKE();
        vm.startPrank(ownerBob);
        m.register{value: min}(_reg("m1", 1 ether, 0));
        m.deactivate(0);
        uint256 beforeBalance = ownerBob.balance;
        m.withdrawStake(0);
        vm.stopPrank();
        assertEq(ownerBob.balance, beforeBalance + min);
        (
            address o,
            ,
            ,
            bytes32 ec,
            ,
            uint256 pp,
            uint256 pend,
            uint256 pblk,
            uint256 stakeAfter,
            uint256 slb,
            bool act,
            string memory uri,
            bytes32 mh,
            bytes32 ih,
            uint256 c,
            uint256 u,
            uint256 st,
            uint256 ls
        ) = m.providers(0);
        assertEq(o, ownerBob);
        assertEq(ec, _ep());
        assertEq(pp, 1 ether);
        assertEq(pend, 0);
        assertEq(pblk, 0);
        assertEq(stakeAfter, 0);
        assertEq(slb, 0);
        assertTrue(act == false);
        assertEq(keccak256(bytes(uri)), keccak256("ipfs://QmExample"));
        assertEq(mh, keccak256("metadata"));
        assertEq(ih, keccak256("identity"));
        assertEq(c, block.number);
        assertEq(u, block.number);
        assertEq(st, 0);
        assertEq(ls, 0);
    }

    function test_withdraw_reverts_when_stake_already_zero() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
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
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.expectRevert(DeOpenRouterMarketplace.ProviderInactive.selector);
        m.withdrawStake(0);
        vm.stopPrank();
    }

    function test_withdraw_reverts_stake_locked() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        uint256 min = m.MIN_STAKE();
        vm.startPrank(ownerBob);
        m.register{value: min}(_reg("m1", 1 ether, 100));
        m.deactivate(0);
        vm.expectRevert(DeOpenRouterMarketplace.StakeLocked.selector);
        m.withdrawStake(0);
        vm.roll(block.number + 100);
        m.withdrawStake(0);
        vm.stopPrank();
    }

    function test_update_provider_metadata() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
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
        (,,,,,,,,,,, string memory uri, bytes32 mh, bytes32 ih,, uint256 updated,,) = m.providers(0);
        assertEq(uri, "ipfs://updated");
        assertEq(mh, newMh);
        assertEq(ih, newIh);
        assertEq(updated, block.number);
    }

    function test_update_metadata_reverts_not_owner() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        DeOpenRouterMarketplace.ProviderMetadataUpdate memory upd = DeOpenRouterMarketplace.ProviderMetadataUpdate({
            metadataURI: "x",
            metadataHash: bytes32(uint256(1)),
            identityHash: bytes32(uint256(2))
        });
        vm.expectRevert(DeOpenRouterMarketplace.NotOwner.selector);
        m.updateProviderMetadata(0, upd);
    }

    function test_slash_reduces_stake_and_pays_treasury() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        (,,,,, uint256 registeredAt,,,) = m.getProviderCore(0);
        address treasury = m.slashTreasury();
        uint256 treasuryBefore = treasury.balance;
        bytes32 reason = keccak256("fraud");
        assertEq(m.nextSlashId(), 0);
        uint256 proposalId = m.proposeSlash(0, 0.005 ether, reason, 1, keccak256("report"));
        assertEq(proposalId, 0);
        vm.roll(block.number + SLASH_CHALLENGE_BLOCKS);
        m.finalizeSlashProposal(proposalId);
        assertEq(treasury.balance, treasuryBefore + 0.005 ether);
        assertEq(m.nextSlashId(), 1);
        (uint256 pid, address sop, uint256 amt, bytes32 rh, uint256 bnum, uint256 ts) = m.slashRecords(0);
        assertEq(pid, 0);
        assertEq(sop, address(this));
        assertEq(amt, 0.005 ether);
        assertEq(rh, reason);
        assertEq(bnum, block.number);
        assertEq(ts, block.timestamp);
        (
            address bob,
            bytes32 ec,
            uint256 pp,
            uint256 stake,
            bool act,
            uint256 c,
            uint256 u,
            uint256 slashedTot,
            uint256 lastSlash
        ) = m.getProviderCore(0);
        assertEq(bob, ownerBob);
        assertEq(ec, _ep());
        assertEq(pp, 1 ether);
        assertEq(stake, m.MIN_STAKE() - 0.005 ether);
        assertTrue(act);
        assertEq(c, registeredAt);
        assertEq(u, registeredAt);
        assertEq(slashedTot, 0.005 ether);
        assertEq(lastSlash, block.number);
        (,,,,,,,,,,, string memory uri, bytes32 mh, bytes32 ih,,,,) = m.providers(0);
        assertEq(keccak256(bytes(uri)), keccak256("ipfs://QmExample"));
        assertEq(mh, keccak256("metadata"));
        assertEq(ih, keccak256("identity"));
    }

    function test_slash_reverts_not_operator() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.startPrank(address(0xDEAD));
        vm.expectRevert(DeOpenRouterMarketplace.NotSlashOperator.selector);
        m.proposeSlash(0, 1, bytes32(0), 0, bytes32(0));
        vm.stopPrank();
    }

    function test_slash_reverts_exceeds_stake() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        uint256 tooMuch = m.MIN_STAKE() + 1;
        vm.expectRevert(DeOpenRouterMarketplace.SlashExceedsStake.selector);
        m.proposeSlash(0, tooMuch, bytes32(0), 0, bytes32(0));
    }

    function test_slash_reverts_invalid_provider() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidProviderId.selector);
        m.proposeSlash(0, 0, bytes32(0), 0, bytes32(0));
    }

    function test_slash_proposal_challenge_blocks_finalize() public {
        address ownerBob = address(0xB0B);
        vm.deal(ownerBob, 20 ether);
        vm.startPrank(ownerBob);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.stopPrank();
        uint256 proposalId = m.proposeSlash(0, 0.001 ether, keccak256("r"), 0, bytes32(0));
        vm.startPrank(ownerBob);
        m.challengeSlashProposal(proposalId);
        vm.stopPrank();
        vm.roll(block.number + SLASH_CHALLENGE_BLOCKS);
        vm.expectRevert(DeOpenRouterMarketplace.ProposalAlreadyChallenged.selector);
        m.finalizeSlashProposal(proposalId);
    }

    function test_transfer_slash_operator_two_step() public {
        address newOp = address(0xCAFE);
        m.proposeSlashOperator(newOp);
        vm.prank(newOp);
        m.acceptSlashOperator();
        assertEq(m.slashOperator(), newOp);
    }

    function test_transfer_slash_operator_reverts_zero_address() public {
        vm.expectRevert(DeOpenRouterMarketplace.ZeroAddress.selector);
        m.proposeSlashOperator(address(0));
    }

    function test_record_audit_emits() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        bytes32 rh = keccak256("audit-report-json");
        assertEq(m.nextAuditId(), 0);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.AuditRecorded(0, 0, address(this), rh, 2);
        m.recordAudit(0, rh, 2);
        assertEq(m.nextAuditId(), 1);
    }

    function test_record_audit_reverts_bad_provider() public {
        vm.expectRevert(DeOpenRouterMarketplace.InvalidProviderId.selector);
        m.recordAudit(0, bytes32(uint256(1)), 0);
    }

    function test_record_audit_reverts_not_recorder() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        vm.startPrank(address(0xDEAD));
        vm.expectRevert(DeOpenRouterMarketplace.NotAuditRecorder.selector);
        m.recordAudit(0, bytes32(uint256(1)), 0);
        vm.stopPrank();
    }

    function test_transfer_audit_recorder_two_step() public {
        address newR = address(0xBEEF);
        m.proposeAuditRecorder(newR);
        vm.prank(newR);
        m.acceptAuditRecorder();
        assertEq(m.auditRecorder(), newR);
    }

    function test_transfer_audit_recorder_reverts_zero_address() public {
        vm.expectRevert(DeOpenRouterMarketplace.ZeroAddress.selector);
        m.proposeAuditRecorder(address(0));
    }

    function test_attest_audit_allowlisted() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        address auditor = address(0xA11);
        m.setAuditor(auditor, true);
        uint256 roundId = m.beginAuditRound(0);
        assertEq(roundId, 1);
        vm.startPrank(auditor);
        m.attestAudit(0, 1, keccak256("rep"), 1, "ipfs://bafy");
        vm.stopPrank();
    }

    function test_attest_audit_reverts_not_auditor() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        m.beginAuditRound(0);
        vm.startPrank(address(0xBEEF));
        vm.expectRevert(DeOpenRouterMarketplace.NotAuditor.selector);
        m.attestAudit(0, 1, bytes32(uint256(1)), 0, "");
        vm.stopPrank();
    }

    function test_record_audit_with_uri_emits() public {
        vm.deal(address(this), 10 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        bytes32 rh = keccak256("audit-report-json");
        assertEq(m.nextAuditId(), 0);
        vm.expectEmit(true, true, true, true);
        emit DeOpenRouterMarketplace.AuditRecorded(0, 0, address(this), rh, 2);
        vm.expectEmit(true, false, false, true);
        emit DeOpenRouterMarketplace.AuditReportUri(0, "ipfs://QmX");
        m.recordAuditWithUri(0, rh, 2, "ipfs://QmX");
        assertEq(m.nextAuditId(), 1);
    }

    function test_price_announce_invoke_uses_old_price_until_effective() public {
        vm.deal(address(this), 30 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        m.announcePriceChange(0, 2 ether);
        (uint256 weiPrice,,,) = m.getEffectivePrice(0);
        assertEq(weiPrice, 1 ether);
        m.invoke{value: 1 ether}(0, bytes32(uint256(1)), bytes32(uint256(2)), 1, 1, 0);
        vm.roll(block.number + PRICE_DELAY);
        (weiPrice,,,) = m.getEffectivePrice(0);
        assertEq(weiPrice, 2 ether);
        m.invoke{value: 2 ether}(0, bytes32(uint256(3)), bytes32(uint256(4)), 1, 1, 0);
    }

    function test_price_applied_on_announce_if_past_effective() public {
        vm.deal(address(this), 30 ether);
        m.register{value: m.MIN_STAKE()}(_reg("m1", 1 ether, 0));
        m.announcePriceChange(0, 2 ether);
        vm.roll(block.number + PRICE_DELAY);
        m.announcePriceChange(0, 3 ether);
        (uint256 weiPrice,,,) = m.getEffectivePrice(0);
        assertEq(weiPrice, 2 ether);
    }
}
