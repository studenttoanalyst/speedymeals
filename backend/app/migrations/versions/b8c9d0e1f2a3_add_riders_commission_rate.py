"""add riders.commission_rate (model/migration drift fix)

The Rider model and admin service already use riders.commission_rate but no
migration ever created the column, so a database built purely from migrations
was missing it (157 tests failed against such a database). Idempotent: some
environments had the column added by hand.

Revision ID: b8c9d0e1f2a3
Revises: a1f0c3d9e2b4
Create Date: 2026-10-12 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a1f0c3d9e2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE riders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC")


def downgrade() -> None:
    op.execute("ALTER TABLE riders DROP COLUMN IF EXISTS commission_rate")
