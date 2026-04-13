// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/interfaces/IERC6551Registry.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.9;

interface IERC6551Registry {
    event ERC6551AccountCreated(
        address account,
        address indexed implementation,
        bytes32 salt,
        uint256 chainId,
        address indexed tokenContract,
        uint256 indexed tokenId
    );

    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address);

    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address);
}


// File contracts/ERC6551Registry.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.9;
contract ERC6551Registry is IERC6551Registry {
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address) {
        bytes memory code = _creationCode(implementation, salt, chainId, tokenContract, tokenId);
        address predicted = _computeAddress(code, salt);

        if (predicted.code.length == 0) {
            address deployed;
            assembly {
                deployed := create2(0, add(code, 0x20), mload(code), salt)
            }
            require(deployed != address(0), "ERC6551: deployment failed");
            predicted = deployed;
        }

        emit ERC6551AccountCreated(predicted, implementation, salt, chainId, tokenContract, tokenId);
        return predicted;
    }

    function account(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external view returns (address) {
        bytes memory code = _creationCode(implementation, salt, chainId, tokenContract, tokenId);
        return _computeAddress(code, salt);
    }

    function _creationCode(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                hex"3d60ad80600a3d3981f3363d3d373d3d3d363d73",
                implementation,
                hex"5af43d82803e903d91602b57fd5bf3",
                abi.encode(salt, chainId, tokenContract, tokenId)
            );
    }

    function _computeAddress(bytes memory code, bytes32 salt) internal view returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(code)));
        return address(uint160(uint256(hash)));
    }
}
