"""
Shared pytest fixtures.

Uses the REAL configured Postgres DB (DATABASE_URL from .env / docker-compose),
not sqlite-in-memory — every model uses `UUID(as_uuid=True)`, a Postgres-only
dialect type, so sqlite can't create these tables correctly.

Each test runs inside its own DB transaction that is rolled back at the end
(standard SQLAlchemy join-a-transaction test pattern) — nothing a test does
is ever actually committed to the real database, and tests don't interfere
with each other or leave junk data behind.
"""
import uuid

import pytest

from app.core.database import engine
from app.platform.wallet_payment.models import Rider


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()

    from sqlalchemy.orm import sessionmaker
    TestingSessionLocal = sessionmaker(bind=connection)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def rider(db_session):
    """A fresh rider, wallet_balance=0, for tests to recharge/deduct against.
    Unique phone/cnic per test run (uuid suffix) so parallel test runs never
    collide on the unique constraints, even though the transaction rolls
    back anyway."""
    unique_suffix = uuid.uuid4().hex[:8]
    r = Rider(
        phone_number=f"+92300{unique_suffix}",
        name="Test Rider",
        cnic_number=f"cnic-{unique_suffix}",
        approval_status="pending",
        wallet_balance=0,
        pending_cash_owed=0,
        is_online=False,
        country_code="+92",
        is_active=True,
    )
    db_session.add(r)
    db_session.commit()
    db_session.refresh(r)
    return r
