export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8000/ws',
  helaRpcUrl: 'https://testnet-rpc.helachain.com',
  helaChainId: 666888,
  helaExplorerUrl: 'https://testnet-blockexplorer.helachain.com',
  contracts: {
    agentNFT: '0x856D6EfEd2D248Bd962242d1756539cdd2f84F1F',
    forgeToken: '0x73ed7b98a7f2aaF263357D77898d1734BCBA951E',
    erc6551Registry: '0x2894CEbA0E8F958355E702430C7F3113B3507101',
    jobEscrow: '0x39458D33f37C9f35C71E0b2dad9E82729DbFC005',
    rentalMarket: '0xC045a76587AfbAEb59bF52d68751f09621381a82'
  },
  ipfsGateway: 'https://gateway.pinata.cloud/ipfs/'
};
