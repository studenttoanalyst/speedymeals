"""add GST settings to restaurants + GST snapshot to orders

Revision ID: f1a2b3c4d5e6
Revises: d3e54e76dd8b
Create Date: 2026-10-10 12:00:00.000000

Restaurants choose whether menu prices are tax-inclusive or tax-exclusive
and set their GST rate. Defaults (rate 0, inclusive) keep every existing
restaurant's maths unchanged. Orders freeze the tax snapshot at placement;
columns are nullable so legacy orders read as "no tax".
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'a1f0c3d9e2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('restaurants', sa.Column('gst_rate', sa.Numeric(), nullable=False, server_default='0'))
    op.add_column('restaurants', sa.Column('prices_include_gst', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('orders', sa.Column('gst_rate', sa.Numeric(), nullable=True))
    op.add_column('orders', sa.Column('prices_include_gst', sa.Boolean(), nullable=True))
    op.add_column('orders', sa.Column('gst_amount', sa.Numeric(), nullable=True))
    op.add_column('orders', sa.Column('net_subtotal', sa.Numeric(), nullable=True))
    op.execute("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;")


def downgrade() -> None:
    op.drop_column('orders', 'net_subtotal')
    op.drop_column('orders', 'gst_amount')
    op.drop_column('orders', 'prices_include_gst')
    op.drop_column('orders', 'gst_rate')
    op.drop_column('restaurants', 'prices_include_gst')
    op.drop_column('restaurants', 'gst_rate')
