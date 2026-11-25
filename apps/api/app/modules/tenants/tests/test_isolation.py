"""Tenant isolation, proven in the database itself (TESTING.md §4).

`app_db` is a connection as aliquot_app, the role the API uses. These tests show
that even SQL written by mistake (no WHERE lab_id) can't cross labs.
"""

from uuid import UUID

import pytest
from sqlalchemy import Connection, text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core.ids import uuid7
from app.testing import make_lab, make_user


def _as_lab(connection: Connection, lab_id: UUID | None) -> None:
    if lab_id is not None:
        connection.execute(
            text("SELECT set_config('app.current_lab_id', :id, true)"), {"id": str(lab_id)}
        )


def _emails(connection: Connection) -> list[str]:
    return list(connection.execute(text("SELECT email FROM users ORDER BY email")).scalars())


@pytest.fixture
def two_labs(db: Connection) -> tuple[UUID, UUID]:
    lab_a, lab_b = make_lab(db, "lab-a"), make_lab(db, "lab-b")
    make_user(db, lab_a, "a@lab-a.example")
    make_user(db, lab_b, "b@lab-b.example")
    return lab_a, lab_b


def test_no_lab_set_sees_nothing(app_db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    with app_db.begin():
        assert _emails(app_db) == []


def test_each_lab_sees_only_its_own_rows(app_db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    lab_a, lab_b = two_labs
    with app_db.begin():
        _as_lab(app_db, lab_a)
        assert _emails(app_db) == ["a@lab-a.example"]
    with app_db.begin():
        _as_lab(app_db, lab_b)
        assert _emails(app_db) == ["b@lab-b.example"]


def test_setting_ends_with_the_transaction(app_db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    with app_db.begin():
        _as_lab(app_db, two_labs[0])
    with app_db.begin():
        assert _emails(app_db) == []  # a reused connection carries no lab over


def test_cannot_write_a_row_for_another_lab(
    app_db: Connection, two_labs: tuple[UUID, UUID]
) -> None:
    lab_a, lab_b = two_labs
    with pytest.raises(DBAPIError, match="row-level security"), app_db.begin():
        _as_lab(app_db, lab_a)
        app_db.execute(
            text(
                "INSERT INTO users (id, lab_id, full_name, email) "
                "VALUES (:id, :lab, 'Forged', 'x@lab-b.example')"
            ),
            {"id": uuid7(), "lab": lab_b},
        )


def test_database_refuses_cross_lab_references(db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    lab_a, lab_b = two_labs
    user_in_b = db.execute(text("SELECT id FROM users WHERE lab_id = :b"), {"b": lab_b}).scalar()
    # Even the owner (no RLS) can't make lab A's session point at lab B's user.
    with pytest.raises(IntegrityError, match="sessions_lab_id_user_id_fkey"):
        db.execute(
            text(
                "INSERT INTO sessions (id, lab_id, user_id, family_id, refresh_token_hash, "
                "expires_at) VALUES (:id, :a, :user, :id, 'h', now())"
            ),
            {"id": uuid7(), "a": lab_a, "user": user_in_b},
        )


def test_app_reads_other_labs_only_through_public_lookup(
    app_db: Connection, two_labs: tuple[UUID, UUID]
) -> None:
    lab_a, _ = two_labs
    with app_db.begin():
        _as_lab(app_db, lab_a)
        assert app_db.execute(text("SELECT slug FROM labs")).scalars().all() == ["lab-a"]
        public = app_db.execute(text("SELECT name, status FROM public_lab_by_slug('lab-b')")).one()
        assert public.name == "Lab-B Laboratory"


def test_audit_log_is_append_only(app_db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    lab_a, _ = two_labs
    with app_db.begin():
        _as_lab(app_db, lab_a)
        app_db.execute(
            text(
                "INSERT INTO audit_log (id, lab_id, actor_type, action, entity) "
                "VALUES (:id, :lab, 'system', 'test.event', 'test')"
            ),
            {"id": uuid7(), "lab": lab_a},
        )
    for statement in ("UPDATE audit_log SET action = 'x'", "DELETE FROM audit_log"):
        with pytest.raises(DBAPIError, match="permission denied"), app_db.begin():
            _as_lab(app_db, lab_a)
            app_db.execute(text(statement))


def test_staff_are_never_hard_deleted(app_db: Connection, two_labs: tuple[UUID, UUID]) -> None:
    with pytest.raises(DBAPIError, match="permission denied"), app_db.begin():
        _as_lab(app_db, two_labs[0])
        app_db.execute(text("DELETE FROM users"))


def test_platform_role_has_no_access_to_staff_or_sessions(
    db: Connection, two_labs: tuple[UUID, UUID]
) -> None:
    db.execute(text("SET ROLE aliquot_platform"))
    try:
        for table in ("users", "sessions", "audit_log"):
            with pytest.raises(DBAPIError, match="permission denied"):
                db.execute(text(f"SELECT count(*) FROM {table}"))  # noqa: S608  # fixed names
    finally:
        db.execute(text("RESET ROLE"))
