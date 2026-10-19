"""add deletion_requests table + manage_deletion_requests permission

Deferred, admin-reviewed account deletion (Google Play account-deletion policy).

Creates `deletion_requests` - the state machine that keeps a rider's data alive
until an admin explicitly approves (pending -> ready_for_review -> approved ->
completed, plus cancelled / on_hold) - and seeds the new admin permission that
gates the review queue.

Nothing here deletes data: the table only records requests and decisions.

Revision ID: d4a7c9e1f2b3
Revises: e8b7a6c5d4f3
Create Date: 2026-10-16 12:00:00.000000

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd4a7c9e1f2b3'
down_revision: Union[str, Sequence[str], None] = 'e8b7a6c5d4f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERMISSION_KEY = 'manage_deletion_requests'
PERMISSION_LABEL = 'Manage Account Deletions'
PERMISSION_DOMAIN = 'account_deletion'
PERMISSION_DESCRIPTION = (
    'Review account deletion requests, approve or hold them, release them back '
    'into the queue, and purge KYC documents that were retained at approval time.'
)
PERMISSION_RISK = 'critical'


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'deletion_requests',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('requested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('grace_ends_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('requested_via', sa.String(length=10), nullable=False),
        sa.Column(
            'reviewed_by',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('admins.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('admin_note', sa.Text(), nullable=True),
        sa.Column('hold_reason', sa.Text(), nullable=True),
        sa.Column('kyc_action', sa.String(length=20), nullable=True),
        sa.Column('kyc_retain_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('kyc_purged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    # Owner lookup + "is there an open request for this account?" (every request)
    op.create_index(
        'ix_deletion_requests_user_id', 'deletion_requests', ['user_id']
    )
    op.create_index(
        'ix_deletion_requests_user_role',
        'deletion_requests',
        ['user_id', 'role'],
    )
    # Admin queue: filter by status, newest first
    op.create_index(
        'ix_deletion_requests_status', 'deletion_requests', ['status']
    )
    # The daily job's exact scan: status = 'pending' AND grace_ends_at <= now
    op.create_index(
        'ix_deletion_requests_status_grace',
        'deletion_requests',
        ['status', 'grace_ends_at'],
    )
    # Who took the decision (SET NULL keeps history if the admin is removed)
    op.create_index(
        'ix_deletion_requests_reviewed_by', 'deletion_requests', ['reviewed_by']
    )

    # --- new admin permission ------------------------------------------------
    # ON CONFLICT DO NOTHING so re-running this migration on a database that
    # already has the row (partial deploy, restored snapshot) is a no-op.
    now = datetime.now(timezone.utc)
    permission_id = uuid.uuid4()
    op.execute(
        sa.text(
            """
            INSERT INTO permissions (id, key, label, domain, description, risk_level, created_at)
            VALUES (:id, :key, :label, :domain, :description, :risk, :now)
            ON CONFLICT (key) DO NOTHING
            """
        ).bindparams(
            id=permission_id,
            key=PERMISSION_KEY,
            label=PERMISSION_LABEL,
            domain=PERMISSION_DOMAIN,
            description=PERMISSION_DESCRIPTION,
            risk=PERMISSION_RISK,
            now=now,
        )
    )
    # Superadmin holds every permission by definition (require_permission also
    # bypasses the check for super_admin), so the explicit grant keeps the role
    # editor's permission list truthful instead of empty. Support does NOT get
    # it: deleting accounts is a critical-risk action, assigned per role in the
    # admin panel.
    op.execute(
        sa.text(
            """
            INSERT INTO admin_role_permissions (role_id, permission_id)
            SELECT r.id, p.id
              FROM admin_roles r
              JOIN permissions p ON p.key = :key
             WHERE r.slug = 'superadmin'
            ON CONFLICT DO NOTHING
            """
        ).bindparams(key=PERMISSION_KEY)
    )

    # Mandatory AGENTS.md privileges maintenance (roles exist only on Supabase).
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
               AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
               AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
                GRANT ALL ON TABLE public.deletion_requests TO anon, authenticated, service_role;
                GRANT ALL ON TABLE public.permissions TO anon, authenticated, service_role;
                GRANT ALL ON TABLE public.admin_role_permissions TO anon, authenticated, service_role;
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    """Downgrade schema.

    Only the schema and the permission seed are removed. Historic deletion
    requests are dropped with the table (they exist solely there), while
    orders, payments and anonymised accounts are untouched - this feature never
    deleted business data to begin with.
    """
    op.execute(
        sa.text(
            """
            DELETE FROM admin_role_permissions
             WHERE permission_id IN (SELECT id FROM permissions WHERE key = :key)
            """
        ).bindparams(key=PERMISSION_KEY)
    )
    op.execute(
        sa.text("DELETE FROM permissions WHERE key = :key").bindparams(
            key=PERMISSION_KEY
        )
    )

    op.drop_index('ix_deletion_requests_reviewed_by', table_name='deletion_requests')
    op.drop_index('ix_deletion_requests_status_grace', table_name='deletion_requests')
    op.drop_index('ix_deletion_requests_status', table_name='deletion_requests')
    op.drop_index('ix_deletion_requests_user_role', table_name='deletion_requests')
    op.drop_index('ix_deletion_requests_user_id', table_name='deletion_requests')
    op.drop_table('deletion_requests')
