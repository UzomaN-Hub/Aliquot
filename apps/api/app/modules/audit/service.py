"""Audit: an append-only record of who changed what.

Called by other modules INSIDE their own transaction, so the change and its audit
entry commit together or not at all (CLAUDE.md "Clinical correctness").
Never put patient names, phone numbers or result values in `before`/`after`
summaries meant for logs; the audit table itself is clinical-grade storage.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import uuid7
from app.modules.audit.models import ActorType, AuditEntry


async def record(
    session: AsyncSession,
    *,
    lab_id: UUID | None,
    actor_type: ActorType,
    actor_id: UUID | None,
    action: str,
    entity: str,
    entity_id: UUID | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    # A plain INSERT with no RETURNING: writers (the console role included) may add to
    # the log without being able to read it back.
    await session.flush()  # earlier changes in this unit of work land first
    await session.execute(
        insert(AuditEntry).values(
            id=uuid7(),
            at=datetime.now(UTC),  # set here, so nothing has to be read back
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
