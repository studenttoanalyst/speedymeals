"""recompute riders.kit_completed for the one-shirt minimum

Revision ID: e5b8d2f4a6c1
Revises: d4a7c9e1f2b3
Create Date: 2026-10-23 23:00:00.000000

The kit rule changed from >= 2 shirts to >= 1 (KIT_MIN_SHIRTS in
wallet_payment/service.py). kit_completed is stored, so riders saved earlier
with deposit + 1 shirt + box would stay blocked until an admin re-saved them.
Data-only: no schema change, so no grants are needed.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e5b8d2f4a6c1'
down_revision: Union[str, Sequence[str], None] = 'd4a7c9e1f2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _recompute(min_shirts: int) -> None:
    op.execute(
        f"""
        UPDATE riders
        SET kit_completed = (kit_deposit_paid AND kit_shirts_issued >= {min_shirts} AND kit_box_issued)
        WHERE kit_completed IS DISTINCT FROM
              (kit_deposit_paid AND kit_shirts_issued >= {min_shirts} AND kit_box_issued)
        """
    )


def upgrade() -> None:
    _recompute(1)


def downgrade() -> None:
    _recompute(2)
