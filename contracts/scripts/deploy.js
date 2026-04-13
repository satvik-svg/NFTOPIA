require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function normalizePrivateKey(value) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function getDeployer(ethers, networkName) {
  if (networkName === "hardhat" || networkName === "localhost") {
    return ethers.getSigners().then((signers) => signers[0]);
  }

  const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is missing. Add it to .env with 0x prefix.");
  }

  return Promise.resolve(new ethers.Wallet(privateKey, ethers.provider));
}

async function main() {
  const { ethers, network } = hre;
  const deployer = await getDeployer(ethers, network.name);

  if (!deployer || !deployer.address) {
    throw new Error("Failed to resolve deployer wallet for this network.");
  }

  console.log("Deploying with:", deployer.address);
  console.log("Network:", network.name);

  const ForgeToken = await ethers.getContractFactory("ForgeToken", deployer);
  const forgeToken = await ForgeToken.deploy(deployer.address);
  await forgeToken.waitForDeployment();

  const AgentNFT = await ethers.getContractFactory("AgentNFT", deployer);
  const agentNFT = await AgentNFT.deploy();
  await agentNFT.waitForDeployment();

  const ERC6551Account = await ethers.getContractFactory("ERC6551Account", deployer);
  const erc6551Implementation = await ERC6551Account.deploy();
  await erc6551Implementation.waitForDeployment();

  const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry", deployer);
  const erc6551Registry = await ERC6551Registry.deploy();
  await erc6551Registry.waitForDeployment();

  const JobEscrow = await ethers.getContractFactory("JobEscrow", deployer);
  const jobEscrow = await JobEscrow.deploy(
    await forgeToken.getAddress(),
    await agentNFT.getAddress(),
    deployer.address
  );
  await jobEscrow.waitForDeployment();

  const RentalMarket = await ethers.getContractFactory("RentalMarket", deployer);
  const rentalMarket = await RentalMarket.deploy(
    await forgeToken.getAddress(),
    await agentNFT.getAddress(),
    deployer.address
  );
  await rentalMarket.waitForDeployment();

  await (await agentNFT.setERC6551Config(await erc6551Registry.getAddress(), await erc6551Implementation.getAddress())).wait();

  const platformRole = await forgeToken.PLATFORM_ROLE();
  await (await forgeToken.grantRole(platformRole, await jobEscrow.getAddress())).wait();

  const updaterRole = await agentNFT.UPDATER_ROLE();
  await (await agentNFT.grantRole(updaterRole, await jobEscrow.getAddress())).wait();

  const addresses = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      ForgeToken: await forgeToken.getAddress(),
      AgentNFT: await agentNFT.getAddress(),
      ERC6551Registry: await erc6551Registry.getAddress(),
      ERC6551AccountImplementation: await erc6551Implementation.getAddress(),
      JobEscrow: await jobEscrow.getAddress(),
      RentalMarket: await rentalMarket.getAddress()
    }
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));

  const latestOutFile = path.join(outDir, "latest.json");
  fs.writeFileSync(latestOutFile, JSON.stringify(addresses, null, 2));

  console.log("Deployment complete");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("Saved:", outFile);
  console.log("Saved:", latestOutFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
