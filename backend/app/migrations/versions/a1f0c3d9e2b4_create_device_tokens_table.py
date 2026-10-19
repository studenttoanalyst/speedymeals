"""create device_tokens table (FCM push registry)

Revision ID: a1f0c3d9e2b4
Revises: d3e54e76dd8b
Create Date: 2026-10-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1f0c3d9e2b4'
down_revision: Union[str, Sequence[str], None] = 'd3e54e76dd8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'device_tokens',
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('token', sa.String(length=512), nullable=False),
        sa.Column('platform', sa.String(length=10), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )
    op.create_index('ix_device_tokens_subject_role', 'device_tokens', ['subject_id', 'role'])
    op.execute("GRANT ALL ON TABLE public.device_tokens TO anon, authenticated, service_role;")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_device_tokens_subject_role', table_name='device_tokens')
    op.drop_table('device_tokens')
