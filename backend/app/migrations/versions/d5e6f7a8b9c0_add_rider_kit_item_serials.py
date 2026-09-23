"""add rider kit item serials

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-09-23 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('riders', sa.Column('shirt_serial_number', sa.String(), nullable=True))
    op.add_column('riders', sa.Column('shirt_serial_numbers', sa.JSON(), nullable=True))
    op.add_column('riders', sa.Column('box_serial_number', sa.String(), nullable=True))
    op.add_column('riders', sa.Column('helmet_serial_number', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('riders', 'helmet_serial_number')
    op.drop_column('riders', 'box_serial_number')
    op.drop_column('riders', 'shirt_serial_numbers')
    op.drop_column('riders', 'shirt_serial_number')
