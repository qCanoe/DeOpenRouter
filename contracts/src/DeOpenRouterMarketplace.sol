// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DeOpenRouterMarketplace {
    uint256 public constant MIN_STAKE = 0.01 ether;

    struct Provider {
        address owner;
        string modelId;
        string endpoint;
        uint256 pricePerCall;
        uint256 stake;
        bool active;
    }

    uint256 public nextProviderId;
    mapping(uint256 => Provider) public providers;

    event ProviderRegistered(
        uint256 indexed id,
        address indexed owner,
        string modelId,
        string endpoint,
        uint256 pricePerCall,
        uint256 stake
    );
    event CallRecorded(
        uint256 indexed providerId,
        address indexed caller,
        bytes32 requestHash,
        bytes32 responseHash,
        uint256 paid
    );

    error InvalidStake();
    error ProviderInactive();
    error PaymentTooLow();
    error NotOwner();

    function register(string calldata modelId, string calldata endpoint, uint256 pricePerCall) external payable {
        if (msg.value < MIN_STAKE) revert InvalidStake();
        uint256 id = nextProviderId++;
        providers[id] = Provider({
            owner: msg.sender,
            modelId: modelId,
            endpoint: endpoint,
            pricePerCall: pricePerCall,
            stake: msg.value,
            active: true
        });
        emit ProviderRegistered(id, msg.sender, modelId, endpoint, pricePerCall, msg.value);
    }

    function deactivate(uint256 providerId) external {
        Provider storage p = providers[providerId];
        if (msg.sender != p.owner) revert NotOwner();
        p.active = false;
    }

    function invoke(uint256 providerId, bytes32 requestHash, bytes32 responseHash) external payable {
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
        emit CallRecorded(providerId, msg.sender, requestHash, responseHash, paid);
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
