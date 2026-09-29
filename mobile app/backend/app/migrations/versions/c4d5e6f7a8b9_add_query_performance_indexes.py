"""add query performance indexes

Indexes for the hot read paths (FK lookups, status filters, date-range
reports), mirroring the index=True / Index(...) definitions on the ORM
models. Reversible; no column types or constraints are touched.

Revision ID: c4d5e6f7a8b9
Revises: b3f8a2d1
Create Date: 2026-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'b3f8a2d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # orders — customer history (user_id), restaurant/admin filters
    # (restaurant_id), rider delivery queries ((rider_id, status) composite),
    # status-only filters, dashboard/report date ranges (placed_at).
    op.create_index('ix_orders_user_id', 'orders', ['user_id'])
    op.create_index('ix_orders_restaurant_id', 'orders', ['restaurant_id'])
    op.create_index('ix_orders_rider_id_status', 'orders', ['rider_id', 'status'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_placed_at', 'orders', ['placed_at'])

    # order_items — per-order item loads (order_id) + FK (menu_item_id).
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_order_items_menu_item_id', 'order_items', ['menu_item_id'])

    # menu_items — menu listing / cart validation by restaurant.
    op.create_index('ix_menu_items_restaurant_id', 'menu_items', ['restaurant_id'])

    # ratings — per-order uniqueness check + FK.
    op.create_index('ix_ratings_order_id', 'ratings', ['order_id'])
    op.create_index('ix_ratings_user_id', 'ratings', ['user_id'])

    # wallet_transactions / cash_deposits / rider_payouts — per-rider
    # history and last-record lookups.
    op.create_index('ix_wallet_transactions_rider_id', 'wallet_transactions', ['rider_id'])
    op.create_index('ix_cash_deposits_rider_id', 'cash_deposits', ['rider_id'])
    op.create_index('ix_rider_payouts_rider_id', 'rider_payouts', ['rider_id'])

    # addresses — address book + ownership checks.
    op.create_index('ix_addresses_user_id', 'addresses', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_addresses_user_id', 'addresses')
    op.drop_index('ix_rider_payouts_rider_id', 'rider_payouts')
    op.drop_index('ix_cash_deposits_rider_id', 'cash_deposits')
    op.drop_index('ix_wallet_transactions_rider_id', 'wallet_transactions')
    op.drop_index('ix_ratings_user_id', 'ratings')
    op.drop_index('ix_ratings_order_id', 'ratings')
    op.drop_index('ix_menu_items_restaurant_id', 'menu_items')
    op.drop_index('ix_order_items_menu_item_id', 'order_items')
    op.drop_index('ix_order_items_order_id', 'order_items')
    op.drop_index('ix_orders_placed_at', 'orders')
    op.drop_index('ix_orders_status', 'orders')
    op.drop_index('ix_orders_rider_id_status', 'orders')
    op.drop_index('ix_orders_restaurant_id', 'orders')
    op.drop_index('ix_orders_user_id', 'orders')
