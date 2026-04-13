module.exports = {
  ...require('./contracts/hardhat.config'),
  paths: {
    sources: './contracts/contracts',
    tests: './contracts/test',
    cache: './contracts/cache',
    artifacts: './contracts/artifacts'
  }
};
