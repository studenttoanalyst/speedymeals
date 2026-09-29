"""add rider kit fields

Revision ID: b3f8a2d1
Revises: ea1fe1cee296
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b3f8a2d1'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('riders', sa.Column('kit_deposit_paid', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('riders', sa.Column('kit_deposit_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('riders', sa.Column('kit_shirts_issued', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('riders', sa.Column('kit_box_issued', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('riders', sa.Column('kit_verified_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('riders', sa.Column('kit_completed', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('riders', 'kit_completed')
    op.drop_column('riders', 'kit_verified_by')
    op.drop_column('riders', 'kit_box_issued')
    op.drop_column('riders', 'kit_shirts_issued')
    op.drop_column('riders', 'kit_deposit_date')
    op.drop_column('riders', 'kit_deposit_paid')
