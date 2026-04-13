const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const hre = require("hardhat");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function findBuildInfo(buildInfoDir, version) {
  const files = fs.readdirSync(buildInfoDir);
  for (const file of files) {
    const fullPath = path.join(buildInfoDir, file);
    const data = readJson(fullPath);
    if (data.solcVersion === version) {
      return data;
    }
  }
  return null;
}

function encodeConstructorArgs(types, values) {
  if (!types.length) {
    return "0x";
  }
  return hre.ethers.AbiCoder.defaultAbiCoder().encode(types, values);
}

function flattenContract(contractsRoot, fileName) {
  const command = `npx hardhat flatten contracts/${fileName}`;
  return execSync(command, {
    cwd: contractsRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function main() {
  const contractsRoot = path.join(__dirname, "..");
  const deploymentsPath = path.join(contractsRoot, "deployments", "hela.json");
  const buildInfoDir = path.join(contractsRoot, "artifacts", "build-info");
  const outDir = path.join(contractsRoot, "verification", "hela");
  const flatDir = path.join(outDir, "flattened");

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`Missing deployment file: ${deploymentsPath}`);
  }

  ensureDir(outDir);
  ensureDir(flatDir);

  const deployment = readJson(deploymentsPath);
  const buildInfo = findBuildInfo(buildInfoDir, "0.8.9");
  if (!buildInfo) {
    throw new Error("Could not find build-info for solc 0.8.9. Run compile first.");
  }

  const standardInputPath = path.join(outDir, "standard-input-0.8.9.json");
  writeJson(standardInputPath, buildInfo.input);

  const verifyBase = "https://testnet.helascan.io/address";
  const deployer = deployment.deployer;
  const addresses = deployment.contracts;

  const specs = [
    {
      key: "ForgeToken",
      fileName: "ForgeToken.sol",
      contractName: "ForgeToken",
      constructorTypes: ["address"],
      constructorValues: [deployer]
    },
    {
      key: "AgentNFT",
      fileName: "AgentNFT.sol",
      contractName: "AgentNFT",
      constructorTypes: [],
      constructorValues: []
    },
    {
      key: "ERC6551Registry",
      fileName: "ERC6551Registry.sol",
      contractName: "ERC6551Registry",
      constructorTypes: [],
      constructorValues: []
    },
    {
      key: "ERC6551AccountImplementation",
      fileName: "ERC6551Account.sol",
      contractName: "ERC6551Account",
      constructorTypes: [],
      constructorValues: []
    },
    {
      key: "JobEscrow",
      fileName: "JobEscrow.sol",
      contractName: "JobEscrow",
      constructorTypes: ["address", "address", "address"],
      constructorValues: [addresses.ForgeToken, addresses.AgentNFT, deployer]
    },
    {
      key: "RentalMarket",
      fileName: "RentalMarket.sol",
      contractName: "RentalMarket",
      constructorTypes: ["address", "address", "address"],
      constructorValues: [addresses.ForgeToken, addresses.AgentNFT, deployer]
    }
  ];

  const output = {
    network: "hela",
    chainId: deployment.chainId,
    compilerVersion: "v0.8.9+commit.e5eed63a",
    optimizationEnabled: true,
    optimizationRuns: 200,
    evmVersion: "default",
    license: "MIT",
    verificationMethodSuggested: "Solidity (Standard JSON Input)",
    standardInputPath,
    contracts: []
  };

  for (const spec of specs) {
    const address = addresses[spec.key];
    if (!address) {
      throw new Error(`Missing address for ${spec.key} in deployment file.`);
    }

    const encodedArgs = encodeConstructorArgs(spec.constructorTypes, spec.constructorValues);
    const flattened = flattenContract(contractsRoot, spec.fileName);
    const flattenedPath = path.join(flatDir, `${spec.contractName}.flattened.sol`);
    fs.writeFileSync(flattenedPath, flattened);

    const item = {
      key: spec.key,
      contractName: spec.contractName,
      sourceName: `contracts/${spec.fileName}`,
      address,
      verifyUrl: `${verifyBase}/${address}/contract-verification`,
      constructorArguments: spec.constructorValues,
      constructorArgumentsEncoded: encodedArgs,
      flattenedSourcePath: flattenedPath
    };

    output.contracts.push(item);
    writeJson(path.join(outDir, `${spec.contractName}.verification.json`), item);
  }

  writeJson(path.join(outDir, "verification-manifest.json"), output);

  const lines = [];
  lines.push("# HeLa Manual Verification Pack");
  lines.push("");
  lines.push(`Compiler: ${output.compilerVersion}`);
  lines.push(`Optimization: enabled (${output.optimizationRuns} runs)`);
  lines.push(`License: ${output.license}`);
  lines.push(`Method: ${output.verificationMethodSuggested}`);
  lines.push(`Standard JSON Input: ${standardInputPath}`);
  lines.push("");
  lines.push("## Contracts");
  lines.push("");

  for (const c of output.contracts) {
    lines.push(`- ${c.contractName}`);
    lines.push(`  Address: ${c.address}`);
    lines.push(`  Verify URL: ${c.verifyUrl}`);
    lines.push(`  Source Name: ${c.sourceName}`);
    lines.push(`  Constructor Args (encoded): ${c.constructorArgumentsEncoded}`);
    lines.push(`  Flattened Source: ${c.flattenedSourcePath}`);
    lines.push("");
  }

  const readmePath = path.join(outDir, "README.md");
  fs.writeFileSync(readmePath, lines.join("\n"));

  console.log(`Verification pack created at: ${outDir}`);
  console.log(`Manifest: ${path.join(outDir, "verification-manifest.json")}`);
  console.log(`Guide: ${readmePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
