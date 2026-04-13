// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract AgentNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 public constant CONTENT_AGENT = 0;
    uint8 public constant TRADING_AGENT = 1;

    uint256 private _nextTokenId;

    struct AgentDNA {
        uint8 agentType;
        string specialization;
        uint256[5] skillScores;
        uint256 level;
        uint256 totalEarnings;
        uint256 jobsCompleted;
        uint256 reputationScore;
        string[] traits;
        uint256 mintedAt;
        address tbaWallet;
    }

    mapping(uint256 => AgentDNA) public agentDNA;

    address public erc6551Registry;
    address public erc6551Implementation;

    uint256 public mintFee = 0.01 ether;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, uint8 agentType, string specialization);
    event AgentEvolved(uint256 indexed tokenId, uint256 newLevel, string newTrait);
    event DNAUpdated(uint256 indexed tokenId, string field);
    event TBACreated(uint256 indexed tokenId, address tbaAddress);

    constructor() ERC721("AgentForge Agent", "AGENT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    function mintAgent(
        address to,
        uint8 _agentType,
        string memory _specialization,
        uint256[5] memory _initialSkills,
        string memory _metadataURI
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "Invalid owner");
        require(_agentType <= 1, "Invalid agent type");

        _nextTokenId += 1;
        uint256 tokenId = _nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _metadataURI);

        string[] memory emptyTraits = new string[](0);
        agentDNA[tokenId] = AgentDNA({
            agentType: _agentType,
            specialization: _specialization,
            skillScores: _initialSkills,
            level: 1,
            totalEarnings: 0,
            jobsCompleted: 0,
            reputationScore: 50,
            traits: emptyTraits,
            mintedAt: block.timestamp,
            tbaWallet: address(0)
        });

        emit AgentMinted(tokenId, to, _agentType, _specialization);
        return tokenId;
    }

    function setERC6551Config(address _registry, address _implementation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registry != address(0), "Invalid registry");
        require(_implementation != address(0), "Invalid implementation");

        erc6551Registry = _registry;
        erc6551Implementation = _implementation;
    }

    function setTBAWallet(uint256 tokenId, address _tbaWallet) external onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "Agent does not exist");
        require(_tbaWallet != address(0), "Invalid TBA wallet");

        agentDNA[tokenId].tbaWallet = _tbaWallet;
        emit TBACreated(tokenId, _tbaWallet);
    }

    function updateSkillScores(uint256 tokenId, uint256[5] memory newScores) external onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "Agent does not exist");

        agentDNA[tokenId].skillScores = newScores;
        emit DNAUpdated(tokenId, "skillScores");
    }

    function recordJobCompleted(uint256 tokenId, uint256 earningsWei) external onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "Agent does not exist");

        agentDNA[tokenId].jobsCompleted += 1;
        agentDNA[tokenId].totalEarnings += earningsWei;
        emit DNAUpdated(tokenId, "jobCompleted");
    }

    function updateReputationScore(uint256 tokenId, uint256 newScore) external onlyRole(UPDATER_ROLE) {
        require(_exists(tokenId), "Agent does not exist");
        require(newScore <= 100, "Score must be 0-100");

        agentDNA[tokenId].reputationScore = newScore;
        emit DNAUpdated(tokenId, "reputationScore");
    }

    function evolveAgent(uint256 tokenId, uint256 newLevel, string memory newTrait, string memory newMetadataURI)
        external
        onlyRole(UPDATER_ROLE)
    {
        require(_exists(tokenId), "Agent does not exist");
        require(bytes(newTrait).length > 0, "Invalid trait");

        agentDNA[tokenId].level = newLevel;
        agentDNA[tokenId].traits.push(newTrait);
        _setTokenURI(tokenId, newMetadataURI);

        emit AgentEvolved(tokenId, newLevel, newTrait);
    }

    function getAgentDNA(uint256 tokenId) external view returns (AgentDNA memory) {
        require(_exists(tokenId), "Agent does not exist");
        return agentDNA[tokenId];
    }

    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
