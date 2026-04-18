// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DeOpenRouterMarketplace {
    uint256 public constant MIN_STAKE = 0.01 ether;

    /// @notice Blocks after `announcePriceChange` before the new price applies.
    uint256 public immutable priceDelayBlocks;

    /// @notice Instant payment path: call is finalized in the same transaction.
    uint8 public constant SETTLEMENT_SETTLED = 1;

    /// @notice Executes slashing; set to `msg.sender` at deploy time.
    address public slashOperator;

    /// @notice May call `recordAudit` to anchor off-chain audit report hashes (demo / ops).
    address public auditRecorder;

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

    uint256 public nextProviderId;
    uint256 public nextCallId;
    uint256 public nextAuditId;
    uint256 public nextSlashId;
    mapping(uint256 => Provider) public providers;
    mapping(uint256 => CallRecord) public calls;
    mapping(uint256 => SlashRecord) public slashRecords;

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

    /// @param priceDelayBlocks_ Blocks to wait after announcing a price change before it applies (mainnet-style: 100+).
    constructor(uint256 priceDelayBlocks_) {
        if (priceDelayBlocks_ == 0) revert InvalidStake();
        priceDelayBlocks = priceDelayBlocks_;
        slashOperator = msg.sender;
        auditRecorder = msg.sender;
    }

    function transferSlashOperator(address newOperator) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (newOperator == address(0)) revert ZeroAddress();
        slashOperator = newOperator;
    }

    function transferAuditRecorder(address newRecorder) external {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (newRecorder == address(0)) revert ZeroAddress();
        auditRecorder = newRecorder;
    }

    /// @param riskLevel LOW=0, MEDIUM=1, HIGH=2 (must match off-chain audit summary).
    function recordAudit(uint256 providerId, bytes32 reportHash, uint8 riskLevel) external {
        if (msg.sender != auditRecorder) revert NotAuditRecorder();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        uint256 auditId = nextAuditId++;
        emit AuditRecorded(auditId, providerId, msg.sender, reportHash, riskLevel);
    }

    /// @notice Returns the price `invoke` must pay after applying any due pending price, and pending schedule if any.
    /// @notice Mirrors what `invoke` will charge after applying any due pending price (without mutating state).
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

    /// @notice Schedules a new price; it applies after `priceDelayBlocks` from this block (unless a prior pending exists — see `_applyPendingPrice`).
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

    function slash(uint256 providerId, uint256 amount, bytes32 reasonHash) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        if (providerId >= nextProviderId) revert InvalidProviderId();
        Provider storage p = providers[providerId];
        if (amount > p.stake) revert SlashExceedsStake();
        p.stake -= amount;
        p.slashedTotal += amount;
        p.lastSlashedAtBlock = block.number;
        uint256 slashId = nextSlashId++;
        slashRecords[slashId] = SlashRecord({
            providerId: providerId,
            operator: msg.sender,
            amount: amount,
            reasonHash: reasonHash,
            blockNumber: block.number,
            timestamp: block.timestamp
        });
        (bool ok,) = slashOperator.call{value: amount}("");
        require(ok, "slash pay");
        emit ProviderSlashed(providerId, slashId, msg.sender, amount, reasonHash, p.stake);
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
}
