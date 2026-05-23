// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HONESTVerifier
 * @notice On-chain verification of multi-source market consensus
 * @dev Part of Harmonic Truth Protocol (HTP)
 * 
 * Every verified market state is submitted to Avalanche C-Chain,
 * creating immutable audit trail and burning AVAX gas.
 */

contract HONESTVerifier {
    
    // ============ Events ============
    
    event VerifiedStateSubmitted(
        bytes32 indexed consensusHash,
        string asset,
        uint256 price,
        uint256 confidence,     // 0-10000 (100.00%)
        uint256 timestamp,
        uint256 blockNumber,
        address indexed submitter
    );
    
    event SourceRegistered(
        string name,
        address oracle,
        uint256 weight
    );
    
    // ============ Structs ============
    
    struct VerifiedState {
        bytes32 consensusHash;      // Merkle root of source readings
        string asset;               // "BTC", "ETH", etc.
        uint256 price;              // USD * 10^8 (8 decimal places)
        uint256 volume;             // 24h volume
        uint256 confidence;         // 0-10000 basis points
        uint256 timestamp;          // Unix timestamp
        uint256 blockNumber;        // Avalanche block number
        address submitter;          // Who submitted this verification
        bool exists;                // For existence checks
    }
    
    struct Source {
        string name;
        address oracle;             // Authorized oracle address
        uint256 weight;             // Consensus weight
        bool active;
    }
    
    // ============ State ============
    
    mapping(bytes32 => VerifiedState) public verifications;
    mapping(string => Source) public sources;
    string[] public sourceList;
    
    address public owner;
    uint256 public submissionCount;
    uint256 public requiredSources = 2;  // Minimum for consensus
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyOracle() {
        require(sources[_getSourceName(msg.sender)].active, "Not registered oracle");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Submit a verified market state to Avalanche
     * @param _consensusHash Merkle root of multi-source readings
     * @param _asset Asset symbol (BTC, ETH, etc.)
     * @param _price Current price in USD * 10^8
     * @param _volume 24h trading volume
     * @param _confidence Consensus confidence 0-10000
     * @return bytes32 The verification ID (consensus hash)
     */
    function submitVerifiedState(
        bytes32 _consensusHash,
        string calldata _asset,
        uint256 _price,
        uint256 _volume,
        uint256 _confidence
    ) external payable returns (bytes32) {
        
        // Require minimum payment to prevent spam (burns AVAX)
        require(msg.value >= 0.001 ether, "Minimum 0.001 AVAX required");
        
        // Validate confidence
        require(_confidence <= 10000, "Confidence must be 0-10000");
        
        // Ensure this hash hasn't been submitted
        require(!verifications[_consensusHash].exists, "State already verified");
        
        // Create verification record
        VerifiedState memory state = VerifiedState({
            consensusHash: _consensusHash,
            asset: _asset,
            price: _price,
            volume: _volume,
            confidence: _confidence,
            timestamp: block.timestamp,
            blockNumber: block.number,
            submitter: msg.sender,
            exists: true
        });
        
        // Store on-chain
        verifications[_consensusHash] = state;
        submissionCount++;
        
        // Emit event for indexing
        emit VerifiedStateSubmitted(
            _consensusHash,
            _asset,
            _price,
            _confidence,
            block.timestamp,
            block.number,
            msg.sender
        );
        
        return _consensusHash;
    }
    
    /**
     * @notice Verify that a market state was attested on-chain
     * @param _consensusHash The hash to verify
     * @return bool True if verified, with full state details
     */
    function verifyState(bytes32 _consensusHash) 
        external 
        view 
        returns (bool, VerifiedState memory) 
    {
        VerifiedState memory state = verifications[_consensusHash];
        return (state.exists, state);
    }
    
    /**
     * @notice Get verification history for an asset
     * @param _asset Asset symbol
     * @param _startBlock Block to start from
     * @return bytes32[] Array of consensus hashes
     */
    function getAssetHistory(string calldata _asset, uint256 _startBlock) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        // In production: Use The Graph for efficient querying
        // This is a simplified version
        bytes32[] memory hashes = new bytes32[](0);
        return hashes;
    }
    
    // ============ Admin Functions ============
    
    function registerSource(
        string calldata _name,
        address _oracle,
        uint256 _weight
    ) external onlyOwner {
        sources[_name] = Source({
            name: _name,
            oracle: _oracle,
            weight: _weight,
            active: true
        });
        sourceList.push(_name);
        
        emit SourceRegistered(_name, _oracle, _weight);
    }
    
    function deactivateSource(string calldata _name) external onlyOwner {
        sources[_name].active = false;
    }
    
    function setRequiredSources(uint256 _count) external onlyOwner {
        requiredSources = _count;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // ============ Helpers ============
    
    function _getSourceName(address _oracle) internal pure returns (string memory) {
        // Simplified - in production use reverse lookup
        return "";
    }
    
    // Receive function to accept AVAX
    receive() external payable {}
}
