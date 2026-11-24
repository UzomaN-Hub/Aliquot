from fastapi.testclient import TestClient
from sqlalchemy import Connection

from app.testing import make_lab


def test_branding_is_public(client: TestClient, db: Connection) -> None:
    make_lab(db, "demo")
    response = client.get("/v1/labs/demo/branding")
    assert response.status_code == 200
    assert response.json() == {"name": "Demo Laboratory", "slug": "demo", "status": "active"}


def test_suspended_lab_still_shows_its_name(client: TestClient, db: Connection) -> None:
    make_lab(db, "demo", status="suspended")
    assert client.get("/v1/labs/demo/branding").json()["status"] == "suspended"


def test_unknown_lab(client: TestClient, db: Connection) -> None:
    response = client.get("/v1/labs/nowhere/branding")
    assert response.status_code == 404
    assert response.json()["code"] == "lab_not_found"
