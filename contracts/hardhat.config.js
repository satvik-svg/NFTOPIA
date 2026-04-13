require('@nomicfoundation/hardhat-toolbox');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootEnvPath = path.resolve(__dirname, '..', '.env');
const localEnvPath = path.resolve(__dirname, '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: false });
}

function normalizePrivateKey(value) {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}

const normalizedPrivateKey = normalizePrivateKey(process.env.PRIVATE_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hela: {
      url: process.env.HELA_RPC_URL || 'https://testnet-rpc.helachain.com',
      chainId: 666888,
      accounts: normalizedPrivateKey ? [normalizedPrivateKey] : []
    },
    localhost: {
      url: 'http://127.0.0.1:8545'
    }
  },
  etherscan: {
    apiKey: {
      hela: 'no-key-needed'
    },
    customChains: [
      {
        network: 'hela',
        chainId: 666888,
        urls: {
          apiURL: 'https://testnet-blockexplorer.helachain.com/api',
          browserURL: 'https://testnet-blockexplorer.helachain.com'
        }
      }
    ]
  }
};
