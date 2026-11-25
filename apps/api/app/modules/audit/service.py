"""Audit: an append-only record of who changed what.

Called by other modules INSIDE their own transaction, so the change and its audit
entry commit together or not at all (CLAUDE.md "Clinical correctness").
Never put patient names, phone numbers or result values in `before`/`after`
summaries meant for logs; the audit table itself is clinical-grade storage.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import ActorType, AuditEntry


async def record(
    session: AsyncSession,
    *,
    lab_id: UUID,
    actor_type: ActorType,
    actor_id: UUID | None,
    action: str,
    entity: str,
    entity_id: UUID | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    session.add(
        AuditEntry(
            lab_id=lab_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            before=before,
            after=after,
            ip=ip,
        )
    )
    await session.flush()
