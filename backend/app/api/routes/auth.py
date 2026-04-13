from datetime import datetime, timedelta, timezone
import re

from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import create_access_token

router = APIRouter()

NONCE_TTL_MINUTES = 10
_nonces: dict[str, tuple[str, datetime]] = {}


class WalletLoginRequest(BaseModel):
    wallet_address: str


class SIWENonceRequest(BaseModel):
    wallet_address: str


class SIWEVerifyRequest(BaseModel):
    wallet_address: str
    message: str
    signature: str
    nonce: str
    chain_id: int | None = None


def _cleanup_nonces() -> None:
    now = datetime.now(timezone.utc)
    expired = [wallet for wallet, (_, expiry) in _nonces.items() if expiry <= now]
    for wallet in expired:
        _nonces.pop(wallet, None)


def _message_chain_id(message: str) -> int | None:
    match = re.search(r"Chain ID:\s*(\d+)", message)
    if not match:
        return None
    return int(match.group(1))


@router.post("/siwe/nonce")
async def create_nonce(request: SIWENonceRequest):
    _cleanup_nonces()
    wallet = request.wallet_address.lower()
    nonce = Account.create().key.hex()[:16]
    expiry = datetime.now(timezone.utc) + timedelta(minutes=NONCE_TTL_MINUTES)
    _nonces[wallet] = (nonce, expiry)
    return {"wallet": wallet, "nonce": nonce, "expiresAt": expiry.isoformat()}


@router.post("/siwe/verify")
async def verify_siwe(request: SIWEVerifyRequest):
    _cleanup_nonces()
    wallet = request.wallet_address.lower()

    nonce_record = _nonces.get(wallet)
    if not nonce_record:
        raise HTTPException(status_code=401, detail="Nonce missing or expired")

    nonce, expiry = nonce_record
    if expiry <= datetime.now(timezone.utc):
        _nonces.pop(wallet, None)
        raise HTTPException(status_code=401, detail="Nonce expired")

    if request.nonce != nonce:
        raise HTTPException(status_code=401, detail="Invalid nonce")

    if request.nonce not in request.message:
        raise HTTPException(status_code=401, detail="Nonce not present in message")

    msg_chain = _message_chain_id(request.message)
    if request.chain_id is not None and msg_chain is not None and msg_chain != request.chain_id:
        raise HTTPException(status_code=401, detail="Chain ID mismatch")

    try:
        recovered = Account.recover_message(encode_defunct(text=request.message), signature=request.signature)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid SIWE signature") from exc

    if recovered.lower() != wallet:
        raise HTTPException(status_code=401, detail="Recovered wallet mismatch")

    _nonces.pop(wallet, None)
    token = create_access_token(wallet)
    return {"access_token": token, "token_type": "bearer", "wallet": wallet}


@router.post("/wallet/login")
async def wallet_login(request: WalletLoginRequest):
    token = create_access_token(request.wallet_address)
    return {"access_token": token, "token_type": "bearer", "wallet": request.wallet_address.lower()}
