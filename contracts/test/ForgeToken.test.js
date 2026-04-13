const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ForgeToken", function () {
  async function deployFixture() {
    const [owner, user, treasury, other] = await ethers.getSigners();
    const ForgeToken = await ethers.getContractFactory("ForgeToken");
    const token = await ForgeToken.deploy(treasury.address);
    await token.waitForDeployment();

    return { token, owner, user, treasury, other };
  }

  it("mints initial supply to treasury", async function () {
    const { token, treasury } = await deployFixture();
    const initialSupply = await token.INITIAL_SUPPLY();
    expect(await token.balanceOf(treasury.address)).to.equal(initialSupply);
  });

  it("allows faucet claims up to max", async function () {
    const { token, user } = await deployFixture();

    for (let i = 0; i < 5; i++) {
      await token.connect(user).claimFaucet();
    }

    await expect(token.connect(user).claimFaucet()).to.be.revertedWith("Max faucet claims reached");
  });

  it("restricts platform mint to role", async function () {
    const { token, user, other } = await deployFixture();
    await expect(token.connect(user).platformMint(other.address, 1)).to.be.reverted;
  });
});
