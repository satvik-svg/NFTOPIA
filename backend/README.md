# AgentForge Backend (Phase 3)

## Quick Start

1. Create env file

```bash
cp .env.example .env
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Start postgres and redis

```bash
docker-compose up -d
```

4. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Run workers

```bash
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```

## Notes
- Phase 3 routes, websocket feeds, and Celery tasks are implemented with functional baseline logic and are ready to be extended in Phase 4.
- Blockchain service uses HeLa deployment addresses from project artifacts.
- If PRIVATE_KEY is empty, forge endpoint still works in off-chain fallback mode for development.
