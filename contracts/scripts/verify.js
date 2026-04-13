const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const hre = require("hardhat");

async function verifyContract(address, constructorArguments) {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments
    });
    console.log(`Verified: ${address}`);
  } catch (error) {
    const message = String(error?.message || error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`Already verified: ${address}`);
      return;
    }
    throw error;
  }
}

async function main() {
  const networkName = hre.network.name;
  if (networkName === "hardhat" || networkName === "localhost") {
    throw new Error("Verification must run on a public network, not local hardhat/localhost.");
  }

  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts, deployer } = deployment;

  await verifyContract(contracts.ForgeToken, [deployer]);
  await verifyContract(contracts.AgentNFT, []);
  await verifyContract(contracts.ERC6551AccountImplementation, []);
  await verifyContract(contracts.ERC6551Registry, []);
  await verifyContract(contracts.JobEscrow, [contracts.ForgeToken, contracts.AgentNFT, deployer]);
  await verifyContract(contracts.RentalMarket, [contracts.ForgeToken, contracts.AgentNFT, deployer]);

  console.log("Verification flow finished.");
}

main().catch((error) => {
  const message = String(error?.message || error);

  // HeLa explorer currently redirects API-style verify endpoints used by hardhat-verify.
  // Fallback to a prepared manual verification bundle for the explorer UI route.
  if (message.includes("Unexpected token '<'") || message.includes("NetworkRequestError")) {
    console.warn("Automatic API verification is unavailable on this explorer endpoint.");
    console.warn("Falling back to manual verification pack generation...");

    execSync("npx hardhat run scripts/prepare-manual-verification.js --network hela", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit"
    });

    console.warn("Manual verification pack is ready under contracts/verification/hela.");
    process.exitCode = 0;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
