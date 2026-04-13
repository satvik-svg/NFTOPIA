import json
import os
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from app.config import settings


class BlockchainService:
    def __init__(self) -> None:
        self.enabled = bool(settings.HELA_RPC_URL)
        self.account = None
        self.w3 = None
        self.agent_nft = None
        self.forge_token = None
        self.erc6551_registry = None
        self.job_escrow = None

        if not self.enabled:
            return

        self.w3 = Web3(Web3.HTTPProvider(settings.HELA_RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        if settings.PRIVATE_KEY:
            self.account = Account.from_key(settings.PRIVATE_KEY)
            self.w3.eth.default_account = self.account.address

        self.agent_nft = self._load_contract(settings.AGENT_NFT_ADDRESS, "AgentNFT")
        self.forge_token = self._load_contract(settings.FORGE_TOKEN_ADDRESS, "ForgeToken")
        self.erc6551_registry = self._load_contract(settings.ERC6551_REGISTRY_ADDRESS, "ERC6551Registry")
        self.job_escrow = self._load_contract(settings.JOB_ESCROW_ADDRESS, "JobEscrow")

    def _abi_search_paths(self, name: str) -> list[Path]:
        root = Path(__file__).resolve().parents[2]
        return [
            root / "abis" / f"{name}.json",
            root.parent / "contracts" / "artifacts" / "contracts" / f"{name}.sol" / f"{name}.json",
        ]

    def _load_contract(self, address: str, name: str):
        if not address or not self.w3:
            return None

        abi = None
        for p in self._abi_search_paths(name):
            if p.exists():
                with open(p, encoding="utf-8") as f:
                    payload = json.load(f)
                abi = payload.get("abi", payload)
                break

        if not abi:
            return None

        return self.w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)

    def _send_tx(self, tx_func) -> dict[str, Any]:
        if not self.w3 or not self.account:
            raise RuntimeError("Blockchain signing is not configured")

        tx = tx_func.build_transaction(
            {
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "gas": 800000,
                "gasPrice": self.w3.eth.gas_price,
                "chainId": settings.HELA_CHAIN_ID,
            }
        )
        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return dict(receipt)

    def mint_agent(
        self,
        to_address: str,
        agent_type: int,
        specialization: str,
        initial_skills: list[int],
        metadata_uri: str,
    ) -> tuple[int, str]:
        if not self.agent_nft:
            raise RuntimeError("AgentNFT contract is not loaded")

        tx_func = self.agent_nft.functions.mintAgent(
            Web3.to_checksum_address(to_address),
            agent_type,
            specialization,
            initial_skills,
            metadata_uri,
        )
        receipt = self._send_tx(tx_func)
        import web3.logs
        logs = self.agent_nft.events.AgentMinted().process_receipt(receipt, errors=web3.logs.IGNORE)
        token_id = int(logs[0]["args"]["tokenId"])
        tx_hash = receipt["transactionHash"].hex()
        return token_id, tx_hash

    def create_tba(self, token_id: int) -> str:
        if not self.erc6551_registry:
            raise RuntimeError("ERC6551Registry contract is not loaded")
        if not settings.ERC6551_ACCOUNT_ADDRESS:
            raise RuntimeError("ERC6551 account implementation address missing")

        salt = b"\x00" * 32
        tx_func = self.erc6551_registry.functions.createAccount(
            Web3.to_checksum_address(settings.ERC6551_ACCOUNT_ADDRESS),
            salt,
            settings.HELA_CHAIN_ID,
            Web3.to_checksum_address(settings.AGENT_NFT_ADDRESS),
            token_id,
        )
        self._send_tx(tx_func)

        tba_address = self.erc6551_registry.functions.account(
            Web3.to_checksum_address(settings.ERC6551_ACCOUNT_ADDRESS),
            salt,
            settings.HELA_CHAIN_ID,
            Web3.to_checksum_address(settings.AGENT_NFT_ADDRESS),
            token_id,
        ).call()
        return tba_address

    def set_tba_wallet(self, token_id: int, tba_wallet: str) -> dict[str, Any]:
        if not self.agent_nft:
            raise RuntimeError("AgentNFT contract is not loaded")
        tx_func = self.agent_nft.functions.setTBAWallet(token_id, Web3.to_checksum_address(tba_wallet))
        return self._send_tx(tx_func)

    def update_skill_scores(self, token_id: int, new_scores: list[int]) -> dict[str, Any]:
        tx_func = self.agent_nft.functions.updateSkillScores(token_id, new_scores)
        return self._send_tx(tx_func)

    def record_job_completed(self, token_id: int, earnings_wei: int) -> dict[str, Any]:
        tx_func = self.agent_nft.functions.recordJobCompleted(token_id, earnings_wei)
        return self._send_tx(tx_func)

    def evolve_agent(self, token_id: int, new_level: int, new_trait: str, new_metadata_uri: str) -> dict[str, Any]:
        tx_func = self.agent_nft.functions.evolveAgent(token_id, new_level, new_trait, new_metadata_uri)
        return self._send_tx(tx_func)

    def complete_job(self, job_id: int) -> dict[str, Any]:
        if not self.job_escrow:
            raise RuntimeError("JobEscrow contract is not loaded")
        tx_func = self.job_escrow.functions.completeJob(job_id)
        return self._send_tx(tx_func)


blockchain = BlockchainService()
