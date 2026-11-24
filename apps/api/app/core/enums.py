"""Postgres enums shared by several modules (SCHEMA.md "Enums").

The types themselves are created by migrations; models only refer to them
(`create_type=False`), so the database stays the single source of truth.
"""

from enum import StrEnum

from sqlalchemy import Enum


class Section(StrEnum):
    CHEM_PATH = "chem_path"
    HAEMATOLOGY = "haematology"
    MICROBIOLOGY = "microbiology"


def pg_enum[E: StrEnum](enum: type[E], name: str) -> Enum:
    """Map a StrEnum to an existing Postgres enum type, storing its values."""
    return Enum(
        enum,
        name=name,
        create_type=False,
        values_callable=lambda members: [member.value for member in members],
    )


SECTION = pg_enum(Section, "lab_section")
