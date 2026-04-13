const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC6551 Registry + Account", function () {
  it("creates deterministic account and exposes token context", async function () {
    const [owner] = await ethers.getSigners();

    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    const skills = [1, 1, 1, 1, 1];
    await nft.mintAgent(owner.address, 0, "Writer", skills, "ipfs://agent/6551");

    const AccountImpl = await ethers.getContractFactory("ERC6551Account");
    const implementation = await AccountImpl.deploy();
    await implementation.waitForDeployment();

    const Registry = await ethers.getContractFactory("ERC6551Registry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const salt = ethers.keccak256(ethers.toUtf8Bytes("agent-1"));
    const chainId = 31337;

    const predicted = await registry.account(
      await implementation.getAddress(),
      salt,
      chainId,
      await nft.getAddress(),
      1
    );

    await registry.createAccount(
      await implementation.getAddress(),
      salt,
      chainId,
      await nft.getAddress(),
      1
    );

    const accountAddress = await registry.account(
      await implementation.getAddress(),
      salt,
      chainId,
      await nft.getAddress(),
      1
    );

    expect(accountAddress).to.equal(predicted);

    const account = await ethers.getContractAt("ERC6551Account", accountAddress);
    const tokenInfo = await account.token();

    expect(tokenInfo[0]).to.equal(BigInt(chainId));
    expect(tokenInfo[1]).to.equal(await nft.getAddress());
    expect(tokenInfo[2]).to.equal(1n);
  });
});
