"""add prep_time_minutes to restaurants

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-10-12 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('restaurants', sa.Column('prep_time_minutes', sa.Integer(), nullable=False, server_default='20'))
    op.execute("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;")


def downgrade() -> None:
    op.drop_column('restaurants', 'prep_time_minutes')
