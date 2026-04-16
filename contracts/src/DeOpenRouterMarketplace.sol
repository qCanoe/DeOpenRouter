// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DeOpenRouterMarketplace {
    uint256 public constant MIN_STAKE = 0.01 ether;

    /// @notice Executes slashing; set to `msg.sender` at deploy time.
    address public slashOperator;

    struct ProviderRegistration {
        string modelId;
        string endpoint;
        uint256 pricePerCall;
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
        string endpoint;
        uint256 pricePerCall;
        uint256 stake;
        bool active;
        string metadataURI;
        bytes32 metadataHash;
        bytes32 identityHash;
        uint256 createdAtBlock;
        uint256 updatedAtBlock;
        uint256 slashedTotal;
        uint256 lastSlashedAtBlock;
    }

    uint256 public nextProviderId;
    uint256 public nextCallId;
    mapping(uint256 => Provider) public providers;

    event ProviderRegistered(
        uint256 indexed id,
        address indexed owner,
        string modelId,
        string endpoint,
        uint256 pricePerCall,
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

    event CallRecorded(
        uint256 indexed providerId,
        address indexed caller,
        bytes32 requestHash,
        bytes32 responseHash,
        uint256 paid,
        uint256 callId,
        uint8 requestFormat,
        uint8 responseFormat
    );

    event ProviderSlashed(
        uint256 indexed providerId,
        address indexed operator,
        uint256 amount,
        bytes32 reasonHash,
        uint256 remainingStake
    );

    error InvalidStake();
    error ProviderInactive();
    error PaymentTooLow();
    error NotOwner();
    error NotSlashOperator();
    error SlashExceedsStake();

    constructor() {
        slashOperator = msg.sender;
    }

    function transferSlashOperator(address newOperator) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        slashOperator = newOperator;
    }

    function register(ProviderRegistration calldata info) external payable {
        if (msg.value < MIN_STAKE) revert InvalidStake();
        uint256 id = nextProviderId++;
        uint256 blockNum = block.number;
        providers[id] = Provider({
            owner: msg.sender,
            modelId: info.modelId,
            endpoint: info.endpoint,
            pricePerCall: info.pricePerCall,
            stake: msg.value,
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
            info.endpoint,
            info.pricePerCall,
            msg.value,
            info.metadataURI,
            info.metadataHash,
            info.identityHash,
            blockNum
        );
    }

    function updateProviderMetadata(uint256 providerId, ProviderMetadataUpdate calldata update) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.metadataURI = update.metadataURI;
        p.metadataHash = update.metadataHash;
        p.identityHash = update.identityHash;
        uint256 blockNum = block.number;
        p.updatedAtBlock = blockNum;
        emit ProviderMetadataUpdated(providerId, update.metadataURI, update.metadataHash, update.identityHash, blockNum);
    }

    function deactivate(uint256 providerId) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.active = false;
    }

    function invoke(
        uint256 providerId,
        bytes32 requestHash,
        bytes32 responseHash,
        uint8 requestFormat,
        uint8 responseFormat
    ) external payable {
        Provider storage p = providers[providerId];
        if (!p.active) revert ProviderInactive();
        if (msg.value < p.pricePerCall) revert PaymentTooLow();
        uint256 paid = p.pricePerCall;
        uint256 refund = msg.value - paid;
        (bool okOwner,) = p.owner.call{value: paid}("");
        require(okOwner, "pay owner");
        if (refund > 0) {
            (bool okRefund,) = msg.sender.call{value: refund}("");
            require(okRefund, "refund");
        }
        uint256 callId = nextCallId++;
        emit CallRecorded(
            providerId, msg.sender, requestHash, responseHash, paid, callId, requestFormat, responseFormat
        );
    }

    function slash(uint256 providerId, uint256 amount, bytes32 reasonHash) external {
        if (msg.sender != slashOperator) revert NotSlashOperator();
        Provider storage p = providers[providerId];
        if (amount > p.stake) revert SlashExceedsStake();
        p.stake -= amount;
        p.slashedTotal += amount;
        p.lastSlashedAtBlock = block.number;
        (bool ok,) = slashOperator.call{value: amount}("");
        require(ok, "slash pay");
        emit ProviderSlashed(providerId, msg.sender, amount, reasonHash, p.stake);
    }

    function withdrawStake(uint256 providerId) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        if (p.active) revert ProviderInactive();
        uint256 s = p.stake;
        if (s == 0) revert InvalidStake();
        p.stake = 0;
        (bool ok,) = msg.sender.call{value: s}("");
        require(ok, "withdraw");
    }
}
