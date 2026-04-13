// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
        
contract ForgeToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18;

    address public treasury;

    mapping(address => uint256) public faucetClaimed;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** 18;
    uint256 public constant MAX_FAUCET_CLAIMS = 5;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FaucetClaimed(address indexed user, uint256 amount);

    constructor(address _treasury) ERC20("AgentForge Token", "FORGE") {
        require(_treasury != address(0), "Invalid treasury");

        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);

        _mint(_treasury, INITIAL_SUPPLY);
    }

    function claimFaucet() external {
        require(faucetClaimed[msg.sender] < MAX_FAUCET_CLAIMS, "Max faucet claims reached");
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "Exceeds max supply");

        faucetClaimed[msg.sender] += 1;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function platformMint(address to, uint256 amount) external onlyRole(PLATFORM_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");

        _mint(to, amount);
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");

        address old = treasury;
        treasury = _treasury;

        emit TreasuryUpdated(old, _treasury);
    }
}
