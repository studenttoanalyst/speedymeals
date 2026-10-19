"""merge heads b2c3d4e5f6a7 and c9d0e1f2a3b4

Revision ID: 2db938dccf5c
Revises: b2c3d4e5f6a7, c9d0e1f2a3b4
Create Date: 2026-10-13 00:54:56.616983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2db938dccf5c'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', 'c9d0e1f2a3b4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
