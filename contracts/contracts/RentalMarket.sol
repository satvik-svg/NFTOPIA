// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RentalMarket is ReentrancyGuard, AccessControl {
    IERC20 public forgeToken;
    IERC721 public agentNFT;
    address public treasury;

    uint256 public platformFeeBps = 500;

    struct RentalListing {
        uint256 tokenId;
        address owner;
        uint256 pricePerDay;
        uint256 maxDuration;
        bool active;
    }

    struct ActiveRental {
        uint256 tokenId;
        address renter;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPaid;
        bool active;
    }

    mapping(uint256 => RentalListing) public listings;
    mapping(uint256 => ActiveRental) public activeRentals;
    mapping(address => uint256[]) public ownerListings;
    mapping(address => uint256[]) public renterActive;

    event AgentListed(uint256 indexed tokenId, address indexed owner, uint256 pricePerDay, uint256 maxDuration);
    event AgentRented(uint256 indexed tokenId, address indexed renter, uint256 days_, uint256 totalCost);
    event RentalEnded(uint256 indexed tokenId);
    event ListingCancelled(uint256 indexed tokenId);

    constructor(address _forgeToken, address _agentNFT, address _treasury) {
        require(_forgeToken != address(0), "Invalid token");
        require(_agentNFT != address(0), "Invalid AgentNFT");
        require(_treasury != address(0), "Invalid treasury");

        forgeToken = IERC20(_forgeToken);
        agentNFT = IERC721(_agentNFT);
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function listForRent(uint256 tokenId, uint256 pricePerDay, uint256 maxDuration) external {
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(pricePerDay > 0, "Price must be > 0");
        require(maxDuration > 0 && maxDuration <= 365, "Duration 1-365 days");
        require(!activeRentals[tokenId].active, "Currently rented");

        listings[tokenId] = RentalListing({
            tokenId: tokenId,
            owner: msg.sender,
            pricePerDay: pricePerDay,
            maxDuration: maxDuration,
            active: true
        });

        ownerListings[msg.sender].push(tokenId);
        emit AgentListed(tokenId, msg.sender, pricePerDay, maxDuration);
    }

    function rent(uint256 tokenId, uint256 days_) external nonReentrant {
        RentalListing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(days_ > 0 && days_ <= listing.maxDuration, "Invalid duration");
        require(!activeRentals[tokenId].active, "Already rented");
        require(msg.sender != listing.owner, "Cannot rent your own");

        uint256 totalCost = listing.pricePerDay * days_;
        uint256 platformFee = (totalCost * platformFeeBps) / 10_000;
        uint256 ownerPayout = totalCost - platformFee;

        require(forgeToken.transferFrom(msg.sender, listing.owner, ownerPayout), "Owner payment failed");
        require(forgeToken.transferFrom(msg.sender, treasury, platformFee), "Fee payment failed");

        activeRentals[tokenId] = ActiveRental({
            tokenId: tokenId,
            renter: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + (days_ * 1 days),
            totalPaid: totalCost,
            active: true
        });

        renterActive[msg.sender].push(tokenId);
        emit AgentRented(tokenId, msg.sender, days_, totalCost);
    }

    function endRental(uint256 tokenId) external {
        ActiveRental storage rental = activeRentals[tokenId];
        require(rental.active, "No active rental");
        require(block.timestamp >= rental.endTime, "Rental not expired");

        rental.active = false;
        emit RentalEnded(tokenId);
    }

    function hasRentalAccess(uint256 tokenId, address user) external view returns (bool) {
        ActiveRental storage rental = activeRentals[tokenId];
        if (!rental.active) {
            return false;
        }
        if (block.timestamp >= rental.endTime) {
            return false;
        }
        return rental.renter == user;
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].owner == msg.sender, "Not owner");
        require(!activeRentals[tokenId].active, "Currently rented");

        listings[tokenId].active = false;
        emit ListingCancelled(tokenId);
    }

    function getOwnerListings(address owner) external view returns (uint256[] memory) {
        return ownerListings[owner];
    }

    function getRenterActive(address renter) external view returns (uint256[] memory) {
        return renterActive[renter];
    }
}
