"""update permission labels and descriptions to merchant terminology

Revision ID: e8b7a6c5d4f3
Revises: 2db938dccf5c
Create Date: 2026-10-15 19:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e8b7a6c5d4f3'
down_revision: Union[str, Sequence[str], None] = '2db938dccf5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MERCHANT_PERMISSIONS_UPDATES = [
    (
        "restaurants.view",
        "View Merchants",
        "restaurants",
        "Browse merchant list, contact numbers, ratings, and open or closed status.",
    ),
    (
        "restaurants.create",
        "Add New Merchant",
        "restaurants",
        "Register new merchant partner and set up their owner login account.",
    ),
    (
        "restaurants.edit_profile",
        "Edit Merchant Details",
        "restaurants",
        "Update merchant name, phone, address, and kitchen opening hours.",
    ),
    (
        "restaurants.toggle_status",
        "Open or Close Merchant",
        "restaurants",
        "Temporarily pause or open a merchant for customer orders.",
    ),
    (
        "restaurants.commission.view",
        "View Commission Rate",
        "restaurants",
        "See how much commission the platform charges this merchant (e.g. 10%).",
    ),
    (
        "restaurants.commission.edit",
        "Change Commission Rate",
        "restaurants",
        "Update the commission percentage charged to this merchant.",
    ),
    (
        "restaurants.credentials.reset",
        "Reset Merchant Password",
        "restaurants",
        "Send a password reset link to the merchant owner.",
    ),
    (
        "finance.settlements.view",
        "View Merchant Payouts",
        "finance",
        "Check how much money the platform owes each merchant for weekly sales.",
    ),
    (
        "finance.settlements.generate",
        "Create Weekly Payout Bills",
        "finance",
        "Calculate weekly earnings and create payout sheets for merchants.",
    ),
    (
        "finance.settlements.mark_paid",
        "Confirm Merchant Paid",
        "finance",
        "Mark that the bank transfer has been sent to the merchant bank account.",
    ),
    (
        "orders.status.override",
        "Manual Order Status Fix",
        "orders",
        "Manually fix an order status if a rider or merchant device has internet problems.",
    ),
    (
        "riders.commission.edit",
        "Change Rider Commission Rate",
        "riders",
        "Configure delivery fee commission percentage charged to riders (e.g. 0% promotional launch vs 10% operating phase).",
    ),
]


def upgrade() -> None:
    permissions_table = sa.table(
        'permissions',
        sa.column('key', sa.String),
        sa.column('label', sa.String),
        sa.column('domain', sa.String),
        sa.column('description', sa.Text),
    )

    for key, label, domain, desc in MERCHANT_PERMISSIONS_UPDATES:
        op.execute(
            permissions_table.update()
            .where(permissions_table.c.key == key)
            .values(label=label, domain=domain, description=desc)
        )

    # Mandatory AGENTS.md privileges maintenance
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
                GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
                GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
                GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
