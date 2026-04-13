const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentNFT", function () {
  async function deployFixture() {
    const [owner, user, other] = await ethers.getSigners();
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    return { nft, owner, user, other };
  }

  it("mints agent and stores DNA", async function () {
    const { nft, user } = await deployFixture();

    const skills = [10, 20, 30, 40, 50];
    await nft.mintAgent(user.address, 1, "Momentum", skills, "ipfs://agent/1");

    const dna = await nft.getAgentDNA(1);
    expect(dna.level).to.equal(1);
    expect(dna.agentType).to.equal(1);
    expect(dna.specialization).to.equal("Momentum");
    expect(await nft.ownerOf(1)).to.equal(user.address);
  });

  it("returns up-to-date owner token list", async function () {
    const { nft, user, other } = await deployFixture();

    const skills = [5, 5, 5, 5, 5];
    await nft.mintAgent(user.address, 0, "Writer", skills, "ipfs://agent/2");

    let userTokens = await nft.getAgentsByOwner(user.address);
    expect(userTokens.length).to.equal(1);
    expect(userTokens[0]).to.equal(1);

    await nft.connect(user).transferFrom(user.address, other.address, 1);

    userTokens = await nft.getAgentsByOwner(user.address);
    const otherTokens = await nft.getAgentsByOwner(other.address);

    expect(userTokens.length).to.equal(0);
    expect(otherTokens.length).to.equal(1);
    expect(otherTokens[0]).to.equal(1);
  });
});
