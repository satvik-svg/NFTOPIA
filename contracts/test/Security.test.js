const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security and Failure Scenarios", function () {
  async function deployCore() {
    const [deployer, user, other, treasury, tba] = await ethers.getSigners();

    const ForgeToken = await ethers.getContractFactory("ForgeToken");
    const token = await ForgeToken.deploy(treasury.address);
    await token.waitForDeployment();

    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    const JobEscrow = await ethers.getContractFactory("JobEscrow");
    const escrow = await JobEscrow.deploy(await token.getAddress(), await nft.getAddress(), treasury.address);
    await escrow.waitForDeployment();

    const RentalMarket = await ethers.getContractFactory("RentalMarket");
    const market = await RentalMarket.deploy(await token.getAddress(), await nft.getAddress(), treasury.address);
    await market.waitForDeployment();

    return { deployer, user, other, treasury, tba, token, nft, escrow, market };
  }

  it("blocks non-admin treasury update in ForgeToken", async function () {
    const { token, user, other } = await deployCore();
    await expect(token.connect(user).setTreasury(other.address)).to.be.reverted;
  });

  it("blocks non-minter mint in AgentNFT", async function () {
    const { nft, user } = await deployCore();
    const skills = [1, 2, 3, 4, 5];

    await expect(
      nft.connect(user).mintAgent(user.address, 0, "Unauthorized", skills, "ipfs://x")
    ).to.be.reverted;
  });

  it("blocks unauthorized job completion", async function () {
    const { token, escrow, user, other, tba } = await deployCore();

    await token.platformMint(user.address, ethers.parseUnits("200", 18));
    await token.connect(user).approve(await escrow.getAddress(), ethers.parseUnits("100", 18));

    await escrow.connect(user).createJob(1, other.address, tba.address, ethers.parseUnits("100", 18));

    await expect(escrow.connect(user).completeJob(1)).to.be.reverted;
  });

  it("rejects invalid fee structure sums", async function () {
    const { escrow } = await deployCore();
    await expect(escrow.updateFeeStructure(8000, 1000, 2000)).to.be.revertedWith("Must total 100%");
  });

  it("blocks self-renting and unauthorized listing cancellation", async function () {
    const { token, nft, market, user, other } = await deployCore();

    const skills = [5, 5, 5, 5, 5];
    await nft.mintAgent(user.address, 0, "Rental", skills, "ipfs://rental-agent");

    await market.connect(user).listForRent(1, ethers.parseUnits("10", 18), 10);

    await expect(market.connect(user).rent(1, 1)).to.be.revertedWith("Cannot rent your own");
    await expect(market.connect(other).cancelListing(1)).to.be.revertedWith("Not owner");

    await token.platformMint(other.address, ethers.parseUnits("50", 18));
    await token.connect(other).approve(await market.getAddress(), ethers.parseUnits("10", 18));
    await market.connect(other).rent(1, 1);

    await expect(market.connect(user).cancelListing(1)).to.be.revertedWith("Currently rented");
  });
});
