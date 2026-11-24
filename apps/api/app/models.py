"""Imports every module's models so Base.metadata knows all tables.

Only Alembic and tests import this file. Application code imports a module's
service, never another module's models (CLAUDE.md "Architecture").
"""

from app.modules.audit import models as audit_models
from app.modules.auth import models as auth_models
from app.modules.staff import models as staff_models
from app.modules.tenants import models as tenants_models

__all__ = ["audit_models", "auth_models", "staff_models", "tenants_models"]
