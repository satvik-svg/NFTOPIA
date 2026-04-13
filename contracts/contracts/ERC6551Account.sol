// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IERC6551Account.sol";

contract ERC6551Account is IERC165, IERC1271, IERC6551Account {
    uint256 public state;

    receive() external payable override {}

    function executeCall(address to, uint256 value, bytes calldata data) external payable returns (bytes memory result) {
        require(_isValidSigner(msg.sender), "Not token owner");
        state += 1;

        bool success;
        (success, result) = to.call{value: value}(data);
        require(success, "Call failed");
    }

    function transferERC20(address tokenAddress, address to, uint256 amount) external {
        require(_isValidSigner(msg.sender), "Not token owner");
        state += 1;
        IERC20(tokenAddress).transfer(to, amount);
    }

    function token() public view override returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        bytes memory footer = new bytes(96);
        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 96)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) {
            return address(0);
        }
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function _isValidSigner(address signer) internal view returns (bool) {
        return signer == owner();
    }

    function isValidSigner(address signer, bytes calldata) external view override returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }
        return bytes4(0);
    }

    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4 magicValue) {
        bool isValid = SignatureChecker.isValidSignatureNow(owner(), hash, signature);
        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }
        return bytes4(0);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC6551Account).interfaceId;
    }
}
