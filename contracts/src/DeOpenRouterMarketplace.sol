// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DeOpenRouterMarketplace
/// @notice MVP marketplace with phased decentralization: two-step role transfers, multi-auditor attestations,
///         challengeable slash proposals, and treasury-directed slashed funds.
contract DeOpenRouterMarketplace {
    uint256 public constant MIN_STAKE = 0.01 ether;

    /// @notice Blocks after `announcePriceChange` before the new price applies.
    uint256 public immutable priceDelayBlocks;

    /// @notice Blocks after a slash proposal before it can be finalized if unchallenged.
    uint256 public slashChallengePeriodBlocks;

    /// @notice Instant payment path: call is finalized in the same transaction.
    uint8 public constant SETTLEMENT_SETTLED = 1;

    /// @notice Executes slashing proposals after the challenge window; set to `msg.sender` at deploy time.
    address public slashOperator;

    /// @notice Receives slashed ETH (treasury / insurance pool), not necessarily the same as slashOperator.
    address public slashTreasury;

    /// @notice Pending two-step transfer for slash operator (multisig-friendly).
    address public pendingSlashOperator;

    /// @notice May call `recordAudit`, manage auditors, and open audit rounds.
    address public auditRecorder;

    /// @notice Pending two-step transfer for audit recorder.
    address public pendingAuditRecorder;

    struct ProviderRegistration {
        string modelId;
        string modelVersion;
        bytes32 endpointCommitment;
        bytes32 capabilityHash;
        uint256 pricePerCall;
        uint256 stakeLockBlocks;
        string metadataURI;
        bytes32 metadataHash;
        bytes32 identityHash;
    }

    struct ProviderMetadataUpdate {
        string metadataURI;
        bytes32 metadataHash;
        bytes32 identityHash;
    }

    struct Provider {
        address owner;
        string modelId;
        string modelVersion;
        bytes32 endpointCommitment;
        bytes32 capabilityHash;
        uint256 pricePerCall;
        uint256 pendingPriceWei;
        uint256 pendingEffectiveBlock;
        uint256 stake;
        uint256 stakeLockBlocks;
        bool active;
        string metadataURI;
        bytes32 metadataHash;
        bytes32 identityHash;
        uint256 createdAtBlock;
        uint256 updatedAtBlock;
        uint256 slashedTotal;
        uint256 lastSlashedAtBlock;
    }

    struct CallRecord {
        uint256 providerId;
        address caller;
        bytes32 requestHash;
        bytes32 responseHash;
        uint256 paid;
        uint256 usageUnits;
        uint256 recordedBlock;
        uint256 recordedAt;
        uint8 settlementStatus;
    }

    struct SlashRecord {
        uint256 providerId;
        address operator;
        uint256 amount;
        bytes32 reasonHash;
        uint256 blockNumber;
        uint256 timestamp;
    }

    struct SlashProposal {
        uint256 providerId;
        uint256 amount;
        bytes32 reasonHash;
        uint256 relatedAuditRound;
        bytes32 reportHash;
        uint256 createdAtBlock;
        address proposer;
        bool challenged;
        bool executed;
    }

    uint256 public nextProviderId;
    uint256 public nextCallId;
    uint256 public nextAuditId;
    uint256 public nextSlashId;
    uint256 public nextSlashProposalId;

    mapping(uint256 => Provider) public providers;
    mapping(uint256 => CallRecord) public calls;
    mapping(uint256 => SlashRecord) public slashRecords;
    mapping(uint256 => SlashProposal) public slashProposals;

    /// @dev Latest opened audit round id per provider (incremented by beginAuditRound).
    mapping(uint256 => uint256) public latestAuditRound;
    /// @dev Currently active round id per provider (must match for attestations).
    mapping(uint256 => uint256) public activeAuditRound;

    mapping(address => bool) public isAuditor;
    mapping(bytes32 => bool) public auditAttestationSeen;

    event ProviderRegistered(
        uint256 indexed id,
        address indexed owner,
        string modelId,
        string modelVersion,
        bytes32 endpointCommitment,
        bytes32 capabilityHash,
        uint256 pricePerCall,
        uint256 stakeLockBlocks,
        uint256 stake,
        string metadataURI,
        bytes32 metadataHash,
        bytes32 identityHash,
        uint256 createdAtBlock
    );

    event ProviderMetadataUpdated(
        uint256 indexed providerId,
        string metadataURI,
        bytes32 metadataHash,
        bytes32 identityHash,
        uint256 updatedAtBlock
    );

    event PriceChangeAnnounced(
        uint256 indexed providerId,
        uint256 newPrice,
        uint256 effectiveBlock,
        uint256 announcedAtBlock
    );

    event PriceChangeApplied(
        uint256 indexed providerId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 appliedAtBlock
    );

    event CallRecorded(
        uint256 indexed providerId,
        address indexed caller,
        bytes32 requestHash,
        bytes32 responseHash,
        uint256 paid,
        uint256 callId,
        uint256 usageUnits,
        uint256 recordedBlock,
        uint256 recordedAt,
        uint8 requestFormat,
        uint8 responseFormat,
        uint8 settlementStatus
    );

    event ProviderSlashed(
        uint256 indexed providerId,
        uint256 indexed slashId,
        address indexed operator,
        uint256 amount,
        bytes32 reasonHash,
        uint256 remainingStake
    );

    /// @notice Off-chain audit JSON (full report) is committed as `reportHash`; `riskLevel` is LOW=0, MEDIUM=1, HIGH=2.
    event AuditRecorded(
        uint256 indexed auditId,
        uint256 indexed providerId,
        address indexed recorder,
        bytes32 reportHash,
        uint8 riskLevel
    );

    /// @notice Optional URI for the full report (IPFS, HTTPS, etc.), same `auditId` as paired `AuditRecorded`.
    event AuditReportUri(uint256 indexed auditId, string reportUri);

    event AuditRoundStarted(uint256 indexed providerId, uint256 indexed roundId);

    event AuditAttested(
        uint256 indexed providerId,
        uint256 indexed roundId,
        address indexed auditor,
        bytes32 reportHash,
        uint8 riskLevel,
        string reportUri
    );

    event AuditorUpdated(address indexed auditor, bool allowed);

    event SlashTreasuryUpdated(address indexed treasury);

    event SlashProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed providerId,
        uint256 amount,
        bytes32 reasonHash,
        uint256 relatedAuditRound,
        bytes32 reportHash,
        uint256 challengeDeadline
    );

    event SlashProposalChallenged(uint256 indexed proposalId, uint256 indexed providerId, address indexed challenger);

    event SlashProposalFinalized(uint256 indexed proposalId, uint256 indexed providerId, bool executed);

    error InvalidStake();
    error ProviderInactive();
    error PaymentTooLow();
    error NotOwner();
    error NotSlashOperator();
    error SlashExceedsStake();
    error NotAuditRecorder();
    error InvalidProviderId();
    error StakeLocked();
    error InvalidEndpointCommitment();
    error ZeroAddress();
    error NotPendingSlashOperator();
    error NotPendingAuditRecorder();
    error NoPendingSlashOperator();
    error NoPendingAuditRecorder();
    error NotAuditor();
    error AuditRoundMismatch();
    error AlreadyAttested();
    error NotSlashProposal();
    error SlashProposalAlreadyExecuted();
    error ProposalAlreadyChallenged();
    error SlashChallengePeriodNotOver();
    error SlashChallengeWindowOver();

    /// @param priceDelayBlocks_ Blocks to wait after announcing a price change before it applies (mainnet-style: 100+).
    /// @param slashChallengePeriodBlocks_ Blocks a provider may challenge a slash proposal before finalization.
    constructor(uint256 priceDelayBlocks_, uint256 slashChallengePeriodBlocks_) {
        if (priceDelayBlocks_ == 0) revert InvalidStake();
        if (slashChallengePeriodBlocks_ == 0) revert InvalidStake();
        priceDelayBlocks = priceDelayBlocks_;
        slashChallengePeriodBlocks = slashChallengePeriodBlocks_;
        slashOperator = msg.sender;
        slashTreasury = msg.sender;
        auditRecorder = msg.sender;
    }

    /// @notice Slashed funds are sent here (e.g. DAO treasury), not to the slash decision-maker.
    function setSlashTreasury(address newTreasury) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (newTreasury == address(0)) revert ZeroAddress();
        slashTreasury = newTreasury;
        emit SlashTreasuryUpdated(newTreasury);
    }

    function setSlashChallengePeriodBlocks(uint256 blocks_) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (blocks_ == 0) revert InvalidStake();
        slashChallengePeriodBlocks = blocks_;
    }

    function proposeSlashOperator(address newOperator) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (newOperator == address(0)) revert ZeroAddress();
        pendingSlashOperator = newOperator;
    }

    function acceptSlashOperator() external {
        if (pendingSlashOperator == address(0)) revert NoPendingSlashOperator();
        if (msg.sender != pendingSlashOperator) revert NotPendingSlashOperator();
        slashOperator = pendingSlashOperator;
        pendingSlashOperator = address(0);
    }

    function cancelSlashOperatorProposal() external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        pendingSlashOperator = address(0);
    }

    function proposeAuditRecorder(address newRecorder) external {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (newRecorder == address(0)) revert ZeroAddress();
        pendingAuditRecorder = newRecorder;
    }

    function acceptAuditRecorder() external {
        if (pendingAuditRecorder == address(0)) revert NoPendingAuditRecorder();
        if (msg.sender != pendingAuditRecorder) revert NotPendingAuditRecorder();
        auditRecorder = pendingAuditRecorder;
        pendingAuditRecorder = address(0);
    }

    function cancelAuditRecorderProposal() external {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        pendingAuditRecorder = address(0);
    }

    function setAuditor(address auditor, bool allowed) external {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (auditor == address(0)) revert ZeroAddress();
        isAuditor[auditor] = allowed;
        emit AuditorUpdated(auditor, allowed);
    }

    /// @notice Opens a new audit round for a provider; independent auditors attest against `roundId`.
    function beginAuditRound(uint256 providerId) external returns (uint256 roundId) {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        roundId = latestAuditRound[providerId] + 1;
        latestAuditRound[providerId] = roundId;
        activeAuditRound[providerId] = roundId;
        emit AuditRoundStarted(providerId, roundId);
    }

    /// @notice Allowlisted auditor submits an attestation for an open round.
    function attestAudit(
        uint256 providerId,
        uint256 roundId,
        bytes32 reportHash,
        uint8 riskLevel,
        string calldata reportUri
    ) external {
        if (!isAuditor[msg.sender]) revert NotAuditor();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        if (roundId == 0 || activeAuditRound[providerId] != roundId) revert AuditRoundMismatch();
        bytes32 attKey = keccak256(abi.encodePacked(providerId, roundId, msg.sender));
        if (auditAttestationSeen[attKey]) revert AlreadyAttested();
        auditAttestationSeen[attKey] = true;
        emit AuditAttested(providerId, roundId, msg.sender, reportHash, riskLevel, reportUri);
    }

    /// @param riskLevel LOW=0, MEDIUM=1, HIGH=2 (must match off-chain audit summary).
    /// @dev Legacy single-recorder path; prefer `recordAuditWithUri` when publishing a report location.
    function recordAudit(uint256 providerId, bytes32 reportHash, uint8 riskLevel) external {
        _recordAudit(providerId, reportHash, riskLevel, "");
    }

    /// @notice Same as `recordAudit` but emits `AuditReportUri` when `reportUri` is non-empty.
    function recordAuditWithUri(uint256 providerId, bytes32 reportHash, uint8 riskLevel, string calldata reportUri)
        external
    {
        _recordAudit(providerId, reportHash, riskLevel, reportUri);
    }

    function _recordAudit(uint256 providerId, bytes32 reportHash, uint8 riskLevel, string memory reportUri) internal {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        uint256 auditId = nextAuditId++;
        emit AuditRecorded(auditId, providerId, msg.sender, reportHash, riskLevel);
        if (bytes(reportUri).length > 0) {
            emit AuditReportUri(auditId, reportUri);
        }
    }

    /// @notice Returns the price `invoke` must pay after applying any due pending price, and pending schedule if any.
    /// @notice Compact read for indexers / tests (avoids huge struct tuple stack in callers).
    function getProviderCore(uint256 providerId)
        external
        view
        returns (
            address owner,
            bytes32 endpointCommitment,
            uint256 pricePerCall,
            uint256 stake,
            bool active,
            uint256 createdAtBlock,
            uint256 updatedAtBlock,
            uint256 slashedTotal,
            uint256 lastSlashedAtBlock
        )
    {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        return (
            p.owner,
            p.endpointCommitment,
            p.pricePerCall,
            p.stake,
            p.active,
            p.createdAtBlock,
            p.updatedAtBlock,
            p.slashedTotal,
            p.lastSlashedAtBlock
        );
    }

    function getEffectivePrice(uint256 providerId)
        external
        view
        returns (uint256 priceWei, bool hasPending, uint256 pendingPrice, uint256 pendingAppliesAtBlock)
    {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        uint256 effective = p.pricePerCall;
        if (p.pendingEffectiveBlock != 0 && block.number >= p.pendingEffectiveBlock) {
            effective = p.pendingPriceWei;
        }
        priceWei = effective;
        hasPending = p.pendingEffectiveBlock != 0 && block.number < p.pendingEffectiveBlock;
        pendingPrice = hasPending ? p.pendingPriceWei : 0;
        pendingAppliesAtBlock = hasPending ? p.pendingEffectiveBlock : 0;
    }

    function register(ProviderRegistration calldata info) external payable {
        if (msg.value < MIN_STAKE) revert InvalidStake();
        if (info.endpointCommitment == bytes32(0)) revert InvalidEndpointCommitment();
        uint256 id = nextProviderId++;
        uint256 blockNum = block.number;
        providers[id] = Provider({
            owner: msg.sender,
            modelId: info.modelId,
            modelVersion: info.modelVersion,
            endpointCommitment: info.endpointCommitment,
            capabilityHash: info.capabilityHash,
            pricePerCall: info.pricePerCall,
            pendingPriceWei: 0,
            pendingEffectiveBlock: 0,
            stake: msg.value,
            stakeLockBlocks: info.stakeLockBlocks,
            active: true,
            metadataURI: info.metadataURI,
            metadataHash: info.metadataHash,
            identityHash: info.identityHash,
            createdAtBlock: blockNum,
            updatedAtBlock: blockNum,
            slashedTotal: 0,
            lastSlashedAtBlock: 0
        });
        emit ProviderRegistered(
            id,
            msg.sender,
            info.modelId,
            info.modelVersion,
            info.endpointCommitment,
            info.capabilityHash,
            info.pricePerCall,
            info.stakeLockBlocks,
            msg.value,
            info.metadataURI,
            info.metadataHash,
            info.identityHash,
            blockNum
        );
    }

    function updateProviderMetadata(uint256 providerId, ProviderMetadataUpdate calldata update) external {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.metadataURI = update.metadataURI;
        p.metadataHash = update.metadataHash;
        p.identityHash = update.identityHash;
        uint256 blockNum = block.number;
        p.updatedAtBlock = blockNum;
        emit ProviderMetadataUpdated(providerId, update.metadataURI, update.metadataHash, update.identityHash, blockNum);
    }

    function announcePriceChange(uint256 providerId, uint256 newPrice) external {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        _applyPendingPrice(providerId, p);
        p.pendingPriceWei = newPrice;
        p.pendingEffectiveBlock = block.number + priceDelayBlocks;
        emit PriceChangeAnnounced(providerId, newPrice, p.pendingEffectiveBlock, block.number);
    }

    function _applyPendingPrice(uint256 providerId, Provider storage p) internal {
        if (p.pendingEffectiveBlock == 0 || block.number < p.pendingEffectiveBlock) {
            return;
        }
        uint256 oldPrice = p.pricePerCall;
        uint256 newPrice = p.pendingPriceWei;
        p.pricePerCall = newPrice;
        p.pendingPriceWei = 0;
        p.pendingEffectiveBlock = 0;
        emit PriceChangeApplied(providerId, oldPrice, newPrice, block.number);
    }

    function deactivate(uint256 providerId) external {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.active = false;
    }

    function invoke(
        uint256 providerId,
        bytes32 requestHash,
        bytes32 responseHash,
        uint8 requestFormat,
        uint8 responseFormat,
        uint256 usageUnits
    ) external payable {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (!p.active) revert ProviderInactive();
        _applyPendingPrice(providerId, p);
        uint256 paid = p.pricePerCall;
        if (msg.value < paid) revert PaymentTooLow();
        uint256 refund = msg.value - paid;
        (bool okOwner,) = p.owner.call{value: paid}("");
        require(okOwner, "pay owner");
        if (refund > 0) {
            (bool okRefund,) = msg.sender.call{value: refund}("");
            require(okRefund, "refund");
        }
        uint256 callId = nextCallId++;
        uint256 bn = block.number;
        uint256 ts = block.timestamp;
        calls[callId] = CallRecord({
            providerId: providerId,
            caller: msg.sender,
            requestHash: requestHash,
            responseHash: responseHash,
            paid: paid,
            usageUnits: usageUnits,
            recordedBlock: bn,
            recordedAt: ts,
            settlementStatus: SETTLEMENT_SETTLED
        });
        emit CallRecorded(
            providerId,
            msg.sender,
            requestHash,
            responseHash,
            paid,
            callId,
            usageUnits,
            bn,
            ts,
            requestFormat,
            responseFormat,
            SETTLEMENT_SETTLED
        );
    }

    /// @notice Create a slash proposal; funds move only after `slashChallengePeriodBlocks` if unchallenged.
    function proposeSlash(
        uint256 providerId,
        uint256 amount,
        bytes32 reasonHash,
        uint256 relatedAuditRound,
        bytes32 reportHash
    ) external returns (uint256 proposalId) {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (amount > p.stake) revert SlashExceedsStake();
        proposalId = nextSlashProposalId++;
        uint256 deadline = block.number + slashChallengePeriodBlocks;
        slashProposals[proposalId] = SlashProposal({
            providerId: providerId,
            amount: amount,
            reasonHash: reasonHash,
            relatedAuditRound: relatedAuditRound,
            reportHash: reportHash,
            createdAtBlock: block.number,
            proposer: msg.sender,
            challenged: false,
            executed: false
        });
        emit SlashProposalCreated(proposalId, providerId, amount, reasonHash, relatedAuditRound, reportHash, deadline);
    }

    /// @notice Provider owner may challenge during the challenge window; prevents finalization.
    function challengeSlashProposal(uint256 proposalId) external {
        SlashProposal storage sp = slashProposals[proposalId];
        if (sp.createdAtBlock == 0) revert NotSlashProposal();
        if (sp.executed) revert SlashProposalAlreadyExecuted();
        if (block.number >= sp.createdAtBlock + slashChallengePeriodBlocks) revert SlashChallengeWindowOver();
        Provider storage p = providers[sp.providerId];
        if (msg.sender != p.owner) revert NotOwner();
        sp.challenged = true;
        emit SlashProposalChallenged(proposalId, sp.providerId, msg.sender);
    }

    /// @notice After the challenge window, execute slash if not challenged. Sends ETH to `slashTreasury`.
    function finalizeSlashProposal(uint256 proposalId) external {
        SlashProposal storage sp = slashProposals[proposalId];
        if (sp.createdAtBlock == 0) revert NotSlashProposal();
        if (sp.executed) revert SlashProposalAlreadyExecuted();
        if (sp.challenged) revert ProposalAlreadyChallenged();
        if (block.number < sp.createdAtBlock + slashChallengePeriodBlocks) revert SlashChallengePeriodNotOver();
        sp.executed = true;
        _executeSlash(sp.providerId, sp.amount, sp.reasonHash, sp.proposer);
        emit SlashProposalFinalized(proposalId, sp.providerId, true);
    }

    function _executeSlash(uint256 providerId, uint256 amount, bytes32 reasonHash, address attributedOperator) internal {
        Provider storage p = providers[providerId];
        if (amount > p.stake) revert SlashExceedsStake();
        p.stake -= amount;
        p.slashedTotal += amount;
        p.lastSlashedAtBlock = block.number;
        uint256 slashId = nextSlashId++;
        slashRecords[slashId] = SlashRecord({
            providerId: providerId,
            operator: attributedOperator,
            amount: amount,
            reasonHash: reasonHash,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        (bool ok,) = slashTreasury.call{value: amount}("");
        require(ok, "slash pay treasury");
        emit ProviderSlashed(providerId, slashId, attributedOperator, amount, reasonHash, p.stake);
    }

    function withdrawStake(uint256 providerId) external {
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        if (p.active) revert ProviderInactive();
        if (block.number < p.createdAtBlock + p.stakeLockBlocks) revert StakeLocked();
        uint256 s = p.stake;
        if (s == 0) revert InvalidStake();
        p.stake = 0;
        (bool ok,) = msg.sender.call{value: s}("");
        require(ok, "withdraw");
    }

    receive() external payable {}
}
