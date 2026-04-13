const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("JobEscrow", function () {
  async function deployFixture() {
    const [deployer, client, agentOwner, tba, treasury] = await ethers.getSigners();

    const ForgeToken = await ethers.getContractFactory("ForgeToken");
    const token = await ForgeToken.deploy(treasury.address);
    await token.waitForDeployment();

    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    const JobEscrow = await ethers.getContractFactory("JobEscrow");
    const escrow = await JobEscrow.deploy(await token.getAddress(), await nft.getAddress(), treasury.address);
    await escrow.waitForDeployment();

    const platformRole = await token.PLATFORM_ROLE();
    await token.grantRole(platformRole, deployer.address);

    await token.platformMint(client.address, ethers.parseUnits("1000", 18));

    return { token, nft, escrow, deployer, client, agentOwner, tba, treasury };
  }

  it("creates and completes jobs with split payouts", async function () {
    const { token, escrow, client, agentOwner, tba, treasury } = await deployFixture();

    const amount = ethers.parseUnits("100", 18);
    await token.connect(client).approve(await escrow.getAddress(), amount);
    await escrow.connect(client).createJob(1, agentOwner.address, tba.address, amount);

    const ownerBefore = await token.balanceOf(agentOwner.address);
    const tbaBefore = await token.balanceOf(tba.address);
    const treasuryBefore = await token.balanceOf(treasury.address);

    await escrow.completeJob(1);

    const ownerAfter = await token.balanceOf(agentOwner.address);
    const tbaAfter = await token.balanceOf(tba.address);
    const treasuryAfter = await token.balanceOf(treasury.address);

    expect(ownerAfter - ownerBefore).to.equal(ethers.parseUnits("70", 18));
    expect(tbaAfter - tbaBefore).to.equal(ethers.parseUnits("20", 18));
    expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("10", 18));
  });
});
