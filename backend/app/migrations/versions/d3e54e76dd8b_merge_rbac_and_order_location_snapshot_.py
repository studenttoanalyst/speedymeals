"""merge rbac and order-location-snapshot heads

Revision ID: d3e54e76dd8b
Revises: f7a8b9c0d1e2, e7f8a9b0c1d2
Create Date: 2026-09-28 22:53:56.760096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3e54e76dd8b'
down_revision: Union[str, Sequence[str], None] = ('f7a8b9c0d1e2', 'e7f8a9b0c1d2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
