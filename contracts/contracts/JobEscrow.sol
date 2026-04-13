// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract JobEscrow is ReentrancyGuard, AccessControl {
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    IERC20 public forgeToken;
    address public agentNFT;
    address public treasury;

    uint256 public ownerShareBps = 7000;
    uint256 public agentShareBps = 2000;
    uint256 public platformShareBps = 1000;

    uint256 public performanceFeeBps = 1500;

    enum JobStatus {
        CREATED,
        COMPLETED,
        CANCELLED
    }

    struct Job {
        uint256 jobId;
        uint256 agentTokenId;
        address client;
        address agentOwner;
        address agentTBAWallet;
        uint256 amount;
        JobStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    struct Allocation {
        uint256 allocationId;
        uint256 agentTokenId;
        address allocator;
        uint256 amount;
        uint256 profit;
        bool active;
        uint256 createdAt;
    }

    uint256 public nextJobId = 1;
    uint256 public nextAllocationId = 1;

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Allocation) public allocations;
    mapping(uint256 => uint256[]) public agentJobs;
    mapping(uint256 => uint256[]) public agentAllocations;
    mapping(address => uint256[]) public userAllocations;

    event JobCreated(uint256 indexed jobId, uint256 indexed agentTokenId, address client, uint256 amount);
    event JobCompleted(uint256 indexed jobId, uint256 ownerPayout, uint256 agentPayout, uint256 platformPayout);
    event JobCancelled(uint256 indexed jobId);
    event CapitalAllocated(uint256 indexed allocationId, uint256 indexed agentTokenId, address allocator, uint256 amount);
    event ProfitDistributed(uint256 indexed allocationId, uint256 profit);
    event AllocationWithdrawn(uint256 indexed allocationId, uint256 amount);

    constructor(address _forgeToken, address _agentNFT, address _treasury) {
        require(_forgeToken != address(0), "Invalid token");
        require(_agentNFT != address(0), "Invalid AgentNFT");
        require(_treasury != address(0), "Invalid treasury");

        forgeToken = IERC20(_forgeToken);
        agentNFT = _agentNFT;
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);
    }

    function createJob(uint256 agentTokenId, address agentOwner, address agentTBAWallet, uint256 amount)
        external
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");
        require(agentOwner != address(0), "Invalid agent owner");
        require(agentTBAWallet != address(0), "Invalid TBA wallet");
        require(forgeToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        uint256 jobId = nextJobId;
        nextJobId += 1;

        jobs[jobId] = Job({
            jobId: jobId,
            agentTokenId: agentTokenId,
            client: msg.sender,
            agentOwner: agentOwner,
            agentTBAWallet: agentTBAWallet,
            amount: amount,
            status: JobStatus.CREATED,
            createdAt: block.timestamp,
            completedAt: 0
        });

        agentJobs[agentTokenId].push(jobId);

        emit JobCreated(jobId, agentTokenId, msg.sender, amount);
        return jobId;
    }

    function completeJob(uint256 jobId) external onlyRole(PLATFORM_ROLE) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.CREATED, "Job not active");

        job.status = JobStatus.COMPLETED;
        job.completedAt = block.timestamp;

        uint256 ownerPayout = (job.amount * ownerShareBps) / 10_000;
        uint256 agentPayout = (job.amount * agentShareBps) / 10_000;
        uint256 platformPayout = job.amount - ownerPayout - agentPayout;

        forgeToken.transfer(job.agentOwner, ownerPayout);
        forgeToken.transfer(job.agentTBAWallet, agentPayout);
        forgeToken.transfer(treasury, platformPayout);

        emit JobCompleted(jobId, ownerPayout, agentPayout, platformPayout);
    }

    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.CREATED, "Job not active");
        require(msg.sender == job.client || hasRole(PLATFORM_ROLE, msg.sender), "Not authorized");

        job.status = JobStatus.CANCELLED;
        forgeToken.transfer(job.client, job.amount);

        emit JobCancelled(jobId);
    }

    function allocateCapital(uint256 agentTokenId, uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(forgeToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        uint256 allocationId = nextAllocationId;
        nextAllocationId += 1;

        allocations[allocationId] = Allocation({
            allocationId: allocationId,
            agentTokenId: agentTokenId,
            allocator: msg.sender,
            amount: amount,
            profit: 0,
            active: true,
            createdAt: block.timestamp
        });

        agentAllocations[agentTokenId].push(allocationId);
        userAllocations[msg.sender].push(allocationId);

        emit CapitalAllocated(allocationId, agentTokenId, msg.sender, amount);
        return allocationId;
    }

    function recordProfit(uint256 allocationId, uint256 profitAmount) external onlyRole(PLATFORM_ROLE) nonReentrant {
        Allocation storage alloc = allocations[allocationId];
        require(alloc.active, "Allocation not active");

        alloc.profit += profitAmount;
        emit ProfitDistributed(allocationId, profitAmount);
    }

    function withdrawAllocation(uint256 allocationId) external nonReentrant {
        Allocation storage alloc = allocations[allocationId];
        require(alloc.allocator == msg.sender, "Not your allocation");
        require(alloc.active, "Already withdrawn");

        alloc.active = false;

        uint256 total = alloc.amount + alloc.profit;
        uint256 perfFee = (alloc.profit * performanceFeeBps) / 10_000;
        uint256 payout = total - perfFee;

        forgeToken.transfer(msg.sender, payout);
        if (perfFee > 0) {
            forgeToken.transfer(treasury, perfFee);
        }

        emit AllocationWithdrawn(allocationId, payout);
    }

    function getJobsByAgent(uint256 agentTokenId) external view returns (uint256[] memory) {
        return agentJobs[agentTokenId];
    }

    function getAllocationsByAgent(uint256 agentTokenId) external view returns (uint256[] memory) {
        return agentAllocations[agentTokenId];
    }

    function getAllocationsByUser(address user) external view returns (uint256[] memory) {
        return userAllocations[user];
    }

    function updateFeeStructure(uint256 _ownerBps, uint256 _agentBps, uint256 _platformBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_ownerBps + _agentBps + _platformBps == 10_000, "Must total 100%");

        ownerShareBps = _ownerBps;
        agentShareBps = _agentBps;
        platformShareBps = _platformBps;
    }
}
