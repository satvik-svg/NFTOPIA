import random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentConfig
from app.models.memory import AgentMemory
from app.services.blockchain_service import blockchain


class AgentOrchestrator:
    PERSONALITY_SEEDS = {
        "cyberpunk_image_gen": [
            "A brooding digital artist obsessed with neon-drenched dystopias",
            "A rebellious creator who channels urban decay into striking visuals",
        ],
        "anime_art": [
            "A passionate otaku artist who brings characters to life with vibrant energy",
            "A meticulous illustrator inspired by soft cinematic anime scenes",
        ],
        "momentum_trader": [
            "An aggressive trader who rides momentum waves with calculated precision",
            "A patient momentum hunter who waits for confirmed breakouts",
        ],
        "custom_rl_trader": [
            "A custom-trained RL agent that adapts its strategy through reinforcement learning",
            "An autonomous quant agent trained via deep RL on historical market data",
        ],
    }

    async def generate_dna_preview(self, request):
        personality = self._generate_personality(request.specialization)
        skills = self._generate_initial_skills(request.agent_type)
        style_params = self._generate_style_params(request.specialization)
        return {
            "agentType": request.agent_type,
            "specialization": request.specialization,
            "personality": personality,
            "skillScores": skills,
            "styleParameters": style_params,
            "level": 1,
            "traits": [],
        }

    async def forge(self, request, db: AsyncSession):
        personality = self._generate_personality(request.specialization)
        skills = self._generate_initial_skills(request.agent_type)
        style_params = self._generate_style_params(request.specialization)
        metadata_uri = "ipfs://placeholder"

        token_id = 0
        tx_hash = None
        tba_address = None

        if blockchain.account and blockchain.agent_nft and blockchain.erc6551_registry:
            try:
                agent_type_int = 0 if request.agent_type == "content" else 1
                token_id, tx_hash = blockchain.mint_agent(
                    to_address=request.owner_address,
                    agent_type=agent_type_int,
                    specialization=request.specialization,
                    initial_skills=skills,
                    metadata_uri=metadata_uri,
                )
                tba_address = blockchain.create_tba(token_id)
                blockchain.set_tba_wallet(token_id, tba_address)
            except Exception:
                token_id = await self._next_offchain_token_id(db)
                tx_hash = None
                tba_address = None
        else:
            token_id = await self._next_offchain_token_id(db)

        agent = AgentConfig(
            token_id=token_id,
            agent_type=request.agent_type,
            specialization=request.specialization,
            personality_prompt=personality,
            style_parameters=style_params,
            skill_scores=skills,
            level=1,
            owner_address=request.owner_address.lower(),
            tba_wallet_address=tba_address,
            metadata_uri=metadata_uri,
        )
        db.add(agent)

        db.add(
            AgentMemory(
                token_id=token_id,
                event_type="agent_minted",
                event_data={
                    "specialization": request.specialization,
                    "owner": request.owner_address,
                    "onchain": bool(tx_hash),
                },
            )
        )
        await db.commit()

        return {
            "tokenId": token_id,
            "dna": {
                "agentType": request.agent_type,
                "specialization": request.specialization,
                "personality": personality,
                "skillScores": skills,
                "level": 1,
            },
            "tbaWallet": tba_address,
            "nftVisualUrl": metadata_uri,
            "txHash": tx_hash,
        }

    async def _next_offchain_token_id(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.max(AgentConfig.token_id)))
        current = result.scalar() or 0
        if current < 900000:
            return 900000 + random.randint(1, 1000)
        return int(current) + 1

    def _generate_personality(self, specialization: str) -> str:
        seeds = self.PERSONALITY_SEEDS.get(specialization, ["A skilled AI agent"])
        base = random.choice(seeds)
        tone = random.choice(["meticulous", "bold", "experimental", "precise", "focused"])
        return f"{base}. Communication style: {tone} and direct."

    def _generate_initial_skills(self, agent_type: str) -> list[int]:
        base = [60, 40, 50, 45, 50] if agent_type == "content" else [30, 55, 60, 65, 50]
        return [max(10, min(100, s + random.randint(-15, 15))) for s in base]

    def _generate_style_params(self, specialization: str) -> dict:
        return {"specialization": specialization, "quality_tier": "standard"}
