"""add order location snapshots

Revision ID: e7f8a9b0c1d2
Revises: d5e6f7a8b9c0
Create Date: 2026-09-28 12:00:00.000000

Point 4 — immutable location snapshots on `orders`, frozen at placement so
tracking/rider views never shift if the customer edits their address or the
restaurant relocates after ordering. Nullable for legacy orders created
before this migration (read paths fall back to live joins when null).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('customer_lat', sa.Numeric(), nullable=True))
    op.add_column('orders', sa.Column('customer_lng', sa.Numeric(), nullable=True))
    op.add_column('orders', sa.Column('restaurant_lat', sa.Numeric(), nullable=True))
    op.add_column('orders', sa.Column('restaurant_lng', sa.Numeric(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'restaurant_lng')
    op.drop_column('orders', 'restaurant_lat')
    op.drop_column('orders', 'customer_lng')
    op.drop_column('orders', 'customer_lat')
