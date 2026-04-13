const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalMarket", function () {
  async function deployFixture() {
    const [deployer, owner, renter, treasury] = await ethers.getSigners();

    const ForgeToken = await ethers.getContractFactory("ForgeToken");
    const token = await ForgeToken.deploy(treasury.address);
    await token.waitForDeployment();

    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    const RentalMarket = await ethers.getContractFactory("RentalMarket");
    const market = await RentalMarket.deploy(await token.getAddress(), await nft.getAddress(), treasury.address);
    await market.waitForDeployment();

    const skills = [10, 10, 10, 10, 10];
    await nft.mintAgent(owner.address, 0, "Generalist", skills, "ipfs://agent/rent-1");

    await token.platformMint(renter.address, ethers.parseUnits("500", 18));

    return { token, nft, market, owner, renter, treasury };
  }

  it("lists, rents, and expires rental access", async function () {
    const { token, market, owner, renter } = await deployFixture();

    const pricePerDay = ethers.parseUnits("10", 18);

    await market.connect(owner).listForRent(1, pricePerDay, 30);

    const totalCost = ethers.parseUnits("30", 18);
    await token.connect(renter).approve(await market.getAddress(), totalCost);
    await market.connect(renter).rent(1, 3);

    expect(await market.hasRentalAccess(1, renter.address)).to.equal(true);

    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await market.endRental(1);
    expect(await market.hasRentalAccess(1, renter.address)).to.equal(false);
  });
});
