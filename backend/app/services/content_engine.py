import base64
import logging
import uuid
from pathlib import Path
from typing import Any

import google.generativeai as genai
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.content import ContentOutput
from app.models.memory import AgentMemory

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

logger = logging.getLogger(__name__)

# Directory where generated images are saved and served from
GENERATED_DIR = Path(__file__).resolve().parent.parent.parent / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


class ContentEngine:

    def __init__(self) -> None:
        self.text_model_name = "gemini-2.5-flash"
        self.image_model_name = "imagen-4.0-fast-generate-001"

    async def generate(self, agent, request, db: AsyncSession):
        content_id = str(uuid.uuid4())[:12]

        if request.content_type == "text":
            result = await self._generate_text(agent, request.prompt)
        elif request.content_type == "image":
            result = await self._generate_image(agent, request.prompt, content_id)
        elif request.content_type == "video":
            result = await self._generate_video(agent, request.prompt)
        else:
            raise ValueError(f"Unknown content type: {request.content_type}")

        content_url = result.get("content_url") or ""
        metadata_uri = result.get("metadata_uri")
        debug_info = result.get("debug_info") or {}

        row = ContentOutput(
            content_id=content_id,
            agent_token_id=request.agent_id,
            creator_address=agent.owner_address,
            content_type=request.content_type,
            prompt=request.prompt,
            content_url=content_url,
            metadata_uri=metadata_uri,
            price_forge=0.0,
        )
        db.add(row)
        db.add(
            AgentMemory(
                token_id=agent.token_id,
                event_type="job_completed",
                event_data={
                    "content_id": content_id,
                    "content_type": request.content_type,
                    "prompt": request.prompt[:200],
                    "generation_source": debug_info.get("source", "unknown"),
                },
            )
        )
        try:
            await db.commit()
        except SQLAlchemyError as exc:
            await db.rollback()
            raise ValueError(f"Could not save generated content: {exc}") from exc

        return {
            "content_id": content_id,
            "agent_token_id": request.agent_id,
            "content_type": request.content_type,
            "content_url": content_url,
            "prompt": request.prompt,
            "metadata_uri": metadata_uri,
            "content_nft_token_id": None,
            "tx_hash": "",
            "debug_info": debug_info,
        }

    async def _generate_text(self, agent, prompt: str) -> dict[str, Any]:
        system_prompt = self._build_personality_prompt(agent)
        request_payload = [system_prompt, f"User request: {prompt}"]

        text_output = await self._gemini_text(request_payload, model_name=agent.gemini_model or self.text_model_name)
        if not text_output:
            text_output = f"{agent.specialization.title()} content draft: {prompt}"

        return {
            "content_url": f"{settings.IPFS_GATEWAY}content/{uuid.uuid4().hex[:16]}",
            "metadata_uri": f"{settings.IPFS_GATEWAY}meta/{uuid.uuid4().hex[:12]}",
            "debug_info": {"source": "text_reference"},
        }

    async def _generate_image(self, agent, prompt: str, content_id: str) -> dict[str, Any]:
        enhanced_prompt = (
            f"{prompt}. Style: {agent.specialization}. "
            f"Artistic direction: {(agent.personality_prompt or '')[:200]}"
        )

        mime_data, image_error = await self._gemini_image(enhanced_prompt)
        if mime_data:
            # Save the image to disk and return a URL that FastAPI can serve
            file_url = self._save_image_to_disk(mime_data, content_id)
            return {
                "content_url": file_url,
                "metadata_uri": f"{settings.IPFS_GATEWAY}meta/{uuid.uuid4().hex[:12]}",
                "debug_info": {"source": "gemini_inline_image"},
            }

        # Fallback: generate a proper SVG placeholder
        fallback_text = await self._gemini_text(
            [f"Describe in vivid detail an image of: {enhanced_prompt}"],
            model_name=agent.gemini_model or self.text_model_name,
        )
        fallback = fallback_text or f"Image concept for {agent.specialization}: {prompt}"
        logger.warning("Image fallback used. prompt=%s, reason=%s", prompt[:80], image_error or "no_inline_data")

        # Save SVG fallback to disk instead of inlining
        svg_url = self._save_svg_fallback(fallback, content_id)
        return {
            "content_url": svg_url,
            "metadata_uri": f"{settings.IPFS_GATEWAY}meta/{uuid.uuid4().hex[:12]}",
            "debug_info": {
                "source": "svg_fallback",
                "reason": image_error or "gemini_no_inline_image",
            },
        }

    async def _generate_video(self, agent, prompt: str) -> dict[str, Any]:
        storyboard_prompt = (
            "Create a detailed video storyboard/script for:\n"
            f"{prompt}\n"
            f"Style: {agent.specialization}\n"
            f"Director vision: {(agent.personality_prompt or '')[:200]}\n"
            "Include scene descriptions, camera movement, transitions, and duration."
        )
        storyboard = await self._gemini_text([storyboard_prompt], model_name=agent.gemini_model or self.text_model_name)
        if not storyboard:
            storyboard = f"Storyboard draft for {agent.specialization}: {prompt}"

        return {
            "content_url": f"{settings.IPFS_GATEWAY}video/{uuid.uuid4().hex[:16]}",
            "metadata_uri": f"{settings.IPFS_GATEWAY}meta/{uuid.uuid4().hex[:12]}",
            "debug_info": {"source": "video_reference"},
        }

    async def _gemini_text(self, payload: list[str], model_name: str) -> str | None:
        if not settings.GEMINI_API_KEY:
            return None

        try:
            model = genai.GenerativeModel(model_name)
            response = await self._to_thread(model.generate_content, payload)
            return getattr(response, "text", None)
        except Exception as exc:
            logger.warning("Gemini text generation failed: %s", exc)
            return None

    async def _gemini_image(self, prompt: str) -> tuple[dict[str, str] | None, str | None]:
        if not settings.GEMINI_API_KEY:
            return None, "gemini_api_key_missing"

        try:
            import httpx

            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.image_model_name}:predict"
                f"?key={settings.GEMINI_API_KEY}"
            )
            payload = {
                "instances": [{"prompt": prompt}],
                "parameters": {"sampleCount": 1}
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()

            # Extract base64 image from the predictions array
            predictions = data.get("predictions", [])
            for prediction in predictions:
                encoded = prediction.get("bytesBase64Encoded")
                if encoded:
                    return {
                        "mime": "image/png",
                        "data": encoded,
                    }, None

            return None, "no_inline_image_in_response"
        except Exception as exc:
            logger.warning("Gemini image generation failed: %s", exc)
            return None, str(exc)[:200]

    def _save_image_to_disk(self, mime_data: dict[str, str], content_id: str) -> str:
        """Save base64 image data to disk and return the serving URL."""
        mime = mime_data["mime"]
        data = mime_data["data"]

        # Determine file extension from MIME type
        ext_map = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        ext = ext_map.get(mime, ".png")
        filename = f"{content_id}{ext}"
        filepath = GENERATED_DIR / filename

        raw_bytes = base64.b64decode(data)
        filepath.write_bytes(raw_bytes)
        logger.info("Saved generated image: %s (%d bytes)", filepath, len(raw_bytes))

        # Return the URL path that FastAPI will serve via StaticFiles mount
        return f"/generated/{filename}"

    def _save_svg_fallback(self, prompt: str, content_id: str) -> str:
        """Save an SVG fallback placeholder to disk and return the serving URL."""
        cleaned = " ".join((prompt or "AI generated image").split())[:60]
        title = self._escape_xml(cleaned or "AI image")
        svg = (
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>"
            "<rect width='600' height='600' fill='#0b1220'/>"
            "<rect x='20' y='20' width='560' height='560' fill='none' stroke='#1d4ed8' stroke-width='2'/>"
            "<text x='300' y='270' fill='#e2e8f0' font-size='22' text-anchor='middle' font-family='Arial'>AI IMAGE PREVIEW</text>"
            f"<text x='300' y='310' fill='#22d3ee' font-size='14' text-anchor='middle' font-family='Arial'>{title}</text>"
            "</svg>"
        )

        filename = f"{content_id}.svg"
        filepath = GENERATED_DIR / filename
        filepath.write_text(svg, encoding="utf-8")

        return f"/generated/{filename}"

    def _escape_xml(self, text: str) -> str:
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;")
        )

    def _extract_image_part(self, response: Any) -> dict[str, str] | None:
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                inline_data = getattr(part, "inline_data", None)
                if not inline_data:
                    continue
                raw_data = getattr(inline_data, "data", None)
                mime = getattr(inline_data, "mime_type", None) or "image/png"
                if isinstance(raw_data, bytes):
                    encoded = base64.b64encode(raw_data).decode("ascii")
                    return {"mime": mime, "data": encoded}
                if isinstance(raw_data, str):
                    return {"mime": mime, "data": raw_data}
        return None

    def _build_personality_prompt(self, agent) -> str:
        return (
            "You are an AI content creator with this personality:\n"
            f"{agent.personality_prompt}\n\n"
            f"Specialization: {agent.specialization}\n"
            f"Style parameters: {agent.style_parameters}\n"
            "Generate content aligned with this persona and remain in character."
        )

    def _encode_text(self, text: str) -> str:
        return base64.b64encode(text.encode("utf-8")).decode("ascii")

    async def _to_thread(self, func, *args, **kwargs):
        import asyncio

        return await asyncio.to_thread(func, *args, **kwargs)
