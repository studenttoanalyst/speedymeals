"""add rbac and password resets

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-09-28 20:00:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PERMISSIONS_DATA = [
    # 1. Restaurants
    ("restaurants.view", "View Restaurants", "restaurants", "Browse restaurant profiles, contact info, ratings, and active status.", "low"),
    ("restaurants.create", "Onboard Restaurant", "restaurants", "Register new restaurants and generate initial owner credentials.", "medium"),
    ("restaurants.edit_profile", "Update Profile", "restaurants", "Modify restaurant name, phone, address coordinates, and operating hours.", "medium"),
    ("restaurants.toggle_status", "Activate/Deactivate", "restaurants", "Suspend or activate a restaurant storefront on the customer app.", "high"),
    ("restaurants.commission.view", "View Commission", "restaurants", "View negotiated commission rates per restaurant (default 10%).", "low"),
    ("restaurants.commission.edit", "Modify Commission", "restaurants", "Alter contract commission rates affecting platform revenue.", "critical"),
    ("restaurants.menu.view", "View Menus", "restaurants", "View full menu catalog, items, categories, and variant pricing.", "low"),
    ("restaurants.menu.manage", "Manage Menus", "restaurants", "Add/edit menu items, upload photos to S3/Supabase, toggle item availability.", "medium"),
    ("restaurants.credentials.reset", "Reset Credentials", "restaurants", "Trigger password resets for restaurant management accounts.", "high"),

    # 2. Riders
    ("riders.view", "View Rider Roster", "riders", "List riders, phone numbers, vehicle types, wallet balances, and status.", "low"),
    ("riders.approve", "Approve/Reject KYC", "riders", "Review CNIC, driving license, and vehicle registration documents.", "high"),
    ("riders.toggle_status", "Activate/Suspend", "riders", "Deactivate or suspend riders from taking deliveries.", "high"),
    ("riders.kit.manage", "Manage Kit & Deposit", "riders", "Record Rs. 5,000 cash deposit and assign individual serials for shirts and box.", "medium"),
    ("riders.live_fleet.view", "Live Fleet Tracking", "riders", "View live GPS positions (Redis 45s TTL), online/offline states on dispatch map.", "low"),
    ("riders.documents.view_private", "View Sensitive KYC", "riders", "Access pre-signed S3/Supabase URLs for private CNIC and license images.", "high"),

    # 3. Orders
    ("orders.view", "View Orders", "orders", "View live and historical orders, line items, and delivery addresses.", "low"),
    ("orders.cancel", "Cancel Orders", "orders", "Cancel active orders from non-terminal states and trigger reversal rules.", "high"),
    ("orders.reassign_rider", "Reassign Rider", "orders", "Intervene in auto-assignment engine to manually reassign order to a rider.", "high"),
    ("orders.live_tracking.view", "Live Order Journey", "orders", "Monitor customer-to-restaurant-to-rider delivery progression.", "low"),
    ("orders.status.override", "Override Order State", "orders", "Force state machine transitions in emergency/system breakdown cases.", "critical"),

    # 4. Finance
    ("finance.settlements.view", "View Settlements", "finance", "View weekly restaurant settlement ledgers and commission deductions.", "low"),
    ("finance.settlements.generate", "Generate Settlements", "finance", "Calculate and generate weekly billing cycles for restaurant payouts.", "high"),
    ("finance.settlements.mark_paid", "Disburse Settlement", "finance", "Mark restaurant payouts as disbursed with bank transfer reference.", "critical"),
    ("finance.rider_payouts.view", "View Rider Payouts", "finance", "View rider earnings ledgers (Rs. 100 base + Rs. 25/km delivery fees).", "low"),
    ("finance.rider_payouts.generate", "Generate Rider Payouts", "finance", "Batch generate weekly payment schedules for rider delivery earnings.", "high"),
    ("finance.rider_payouts.mark_paid", "Disburse Rider Payout", "finance", "Confirm cash or bank transfer disbursement to riders.", "critical"),
    ("finance.cash_discrepancies.view", "Audit COD Deposits", "finance", "Monitor rider cash deposits where submitted amount != expected COD collection.", "medium"),
    ("finance.cash_discrepancies.resolve", "Reconcile Cash Variance", "finance", "Forgive, adjust, or mark resolved cash discrepancies up to Rs. 5,000 COD cap.", "critical"),
    ("finance.wallet.adjust", "Manual Wallet Credit", "finance", "Manually credit/debit rider wallet balances (e.g. kit refunds, dispute fixes).", "critical"),

    # 5. Customers
    ("customers.view", "View Customers", "customers", "Inspect customer accounts, delivery addresses, and past order frequency.", "low"),
    ("customers.toggle_status", "Block/Unblock Customer", "customers", "Ban abusive customer accounts or block repeat COD fraudulent orderers.", "high"),
    ("customers.ratings.view", "View Ratings", "customers", "Read food quality and delivery service reviews and ratings.", "low"),
    ("customers.ratings.moderate", "Moderate Reviews", "customers", "Hide defamatory or abusive customer reviews from public storefronts.", "medium"),

    # 6. Marketing & Pricing
    ("marketing.promotions.view", "View Promotions", "marketing", "Review active discount voucher codes, banners, and campaign rules.", "low"),
    ("marketing.promotions.manage", "Manage Discounts", "marketing", "Create coupon codes, percentage discounts, minimum spends, and expiry dates.", "medium"),
    ("pricing.delivery_fee.view", "View Delivery Rates", "pricing", "View global delivery fee formula (Rs. 100 base + Rs. 25/km).", "low"),
    ("pricing.delivery_fee.edit", "Modify Delivery Rates", "pricing", "Alter base delivery fee or per-km charge matrix across the platform.", "critical"),

    # 7. Analytics
    ("analytics.dashboard.view", "View Main Dashboard", "analytics", "Inspect top-level daily GMV, active order count, and delivery metrics.", "low"),
    ("analytics.reports.export", "Export CSV Reports", "analytics", "Download periodic accounting, settlement, and sales performance reports.", "medium"),
    ("analytics.audit_logs.view", "View Audit Trail", "analytics", "Review complete chronological administrative actions and change logs.", "high"),

    # 8. Admins / Governance
    ("admins.roles.manage", "Manage Custom Roles", "admins", "Create, edit, recolor, and delete custom admin roles.", "critical"),
    ("admins.accounts.view", "View Admin Accounts", "admins", "View all internal staff profiles, assigned roles, and activity status.", "medium"),
    ("admins.accounts.create", "Provision Admin User", "admins", "Create new admin profiles, generate emails, and issue initial credentials.", "critical"),
    ("admins.accounts.manage", "Edit Staff Accounts", "admins", "Modify staff details, reassign roles, and activate/deactivate accounts.", "high"),
    ("admins.accounts.reset_credentials", "Reset Admin Passwords", "admins", "Revoke active sessions and force credential resets for internal staff.", "critical"),
]

SUPPORT_PERMISSION_KEYS = [
    "restaurants.view",
    "restaurants.menu.view",
    "riders.view",
    "riders.live_fleet.view",
    "orders.view",
    "orders.live_tracking.view",
    "customers.view",
    "customers.ratings.view",
    "analytics.dashboard.view",
]


def upgrade() -> None:
    # 1. Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('domain', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('risk_level', sa.String(length=20), server_default='low', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index('ix_permissions_key', 'permissions', ['key'], unique=True)
    op.create_index('ix_permissions_domain', 'permissions', ['domain'], unique=False)

    # 2. Create admin_roles table
    op.create_table(
        'admin_roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), server_default='#6366F1', nullable=False),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('is_system', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_admin_roles_slug', 'admin_roles', ['slug'], unique=True)

    # 3. Create admin_role_permissions table
    op.create_table(
        'admin_role_permissions',
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('permission_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['admin_roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    # 4. Create admin_audit_logs table
    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('admin_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('domain', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('changes_diff', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_admin_audit_logs_action', 'admin_audit_logs', ['action'], unique=False)
    op.create_index('ix_admin_audit_logs_domain', 'admin_audit_logs', ['domain'], unique=False)
    op.create_index('ix_admin_audit_logs_admin_id', 'admin_audit_logs', ['admin_id'], unique=False)

    # 5. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='valid', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash')
    )
    op.create_index('ix_password_reset_tokens_email', 'password_reset_tokens', ['email'], unique=False)
    op.create_index('ix_password_reset_tokens_role', 'password_reset_tokens', ['role'], unique=False)
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=True)

    # 6. Add columns to admins table
    op.add_column('admins', sa.Column('first_name', sa.String(length=50), nullable=True))
    op.add_column('admins', sa.Column('last_name', sa.String(length=50), nullable=True))
    op.add_column('admins', sa.Column('role_id', sa.UUID(), nullable=True))
    op.add_column('admins', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('admins', sa.Column('must_change_password', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('admins', sa.Column('invitation_token', sa.String(length=255), nullable=True))
    op.add_column('admins', sa.Column('invitation_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('admins', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key('fk_admins_role_id', 'admins', 'admin_roles', ['role_id'], ['id'], ondelete='RESTRICT')
    op.create_index('ix_admins_role_id', 'admins', ['role_id'], unique=False)

    # 7. Seed permissions
    now = datetime.now(timezone.utc)
    permissions_table = sa.table(
        'permissions',
        sa.column('id', sa.UUID),
        sa.column('key', sa.String),
        sa.column('label', sa.String),
        sa.column('domain', sa.String),
        sa.column('description', sa.Text),
        sa.column('risk_level', sa.String),
        sa.column('created_at', sa.DateTime(timezone=True)),
    )
    admin_roles_table = sa.table(
        'admin_roles',
        sa.column('id', sa.UUID),
        sa.column('name', sa.String),
        sa.column('slug', sa.String),
        sa.column('color', sa.String),
        sa.column('icon', sa.String),
        sa.column('is_system', sa.Boolean),
        sa.column('created_by', sa.UUID),
        sa.column('created_at', sa.DateTime(timezone=True)),
        sa.column('updated_at', sa.DateTime(timezone=True)),
    )
    admin_role_permissions_table = sa.table(
        'admin_role_permissions',
        sa.column('role_id', sa.UUID),
        sa.column('permission_id', sa.UUID),
    )

    perm_id_map = {}
    for key, label, domain, desc, risk in PERMISSIONS_DATA:
        p_id = uuid.uuid4()
        perm_id_map[key] = p_id
        op.bulk_insert(
            permissions_table,
            [{
                'id': p_id,
                'key': key,
                'label': label,
                'domain': domain,
                'description': desc,
                'risk_level': risk,
                'created_at': now,
            }]
        )

    # 8. Seed system roles: Superadmin and Support
    superadmin_role_id = uuid.uuid4()
    support_role_id = uuid.uuid4()

    op.bulk_insert(
        admin_roles_table,
        [
            {
                'id': superadmin_role_id,
                'name': 'Superadmin',
                'slug': 'superadmin',
                'color': '#DC2626',
                'icon': 'ShieldCheck',
                'is_system': True,
                'created_by': None,
                'created_at': now,
                'updated_at': now,
            },
            {
                'id': support_role_id,
                'name': 'Support',
                'slug': 'support',
                'color': '#3B82F6',
                'icon': 'Headset',
                'is_system': True,
                'created_by': None,
                'created_at': now,
                'updated_at': now,
            }
        ]
    )

    # Assign all permissions to Superadmin
    superadmin_perms = [{'role_id': superadmin_role_id, 'permission_id': pid} for pid in perm_id_map.values()]
    op.bulk_insert(admin_role_permissions_table, superadmin_perms)

    # Assign support permissions to Support role
    support_perms = [
        {'role_id': support_role_id, 'permission_id': perm_id_map[k]}
        for k in SUPPORT_PERMISSION_KEYS
        if k in perm_id_map
    ]
    if support_perms:
        op.bulk_insert(admin_role_permissions_table, support_perms)

    # 9. Backfill existing admins with role_id
    bind = op.get_bind()
    bind.execute(
        sa.text(
            f"UPDATE admins SET role_id = '{superadmin_role_id}' WHERE role = 'super_admin' OR role_id IS NULL"
        )
    )
    bind.execute(
        sa.text(
            f"UPDATE admins SET role_id = '{support_role_id}' WHERE role = 'support'"
        )
    )

    # 10. Mandatory Supabase Grants per AGENTS.md rule
    try:
        bind.execute(sa.text("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;"))
        bind.execute(sa.text("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;"))
        bind.execute(sa.text("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;"))
        bind.execute(sa.text("GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;"))
        bind.execute(sa.text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;"))
        bind.execute(sa.text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;"))
        bind.execute(sa.text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;"))
    except Exception:
        # Pass gracefully on local test databases where these roles may not exist
        pass


def downgrade() -> None:
    op.drop_constraint('fk_admins_role_id', 'admins', type_='foreignkey')
    op.drop_index('ix_admins_role_id', table_name='admins')
    op.drop_column('admins', 'last_login_at')
    op.drop_column('admins', 'invitation_expires_at')
    op.drop_column('admins', 'invitation_token')
    op.drop_column('admins', 'must_change_password')
    op.drop_column('admins', 'phone')
    op.drop_column('admins', 'role_id')
    op.drop_column('admins', 'last_name')
    op.drop_column('admins', 'first_name')

    op.drop_index('ix_password_reset_tokens_token_hash', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_role', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_email', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')

    op.drop_index('ix_admin_audit_logs_admin_id', table_name='admin_audit_logs')
    op.drop_index('ix_admin_audit_logs_domain', table_name='admin_audit_logs')
    op.drop_index('ix_admin_audit_logs_action', table_name='admin_audit_logs')
    op.drop_table('admin_audit_logs')

    op.drop_table('admin_role_permissions')

    op.drop_index('ix_admin_roles_slug', table_name='admin_roles')
    op.drop_table('admin_roles')

    op.drop_index('ix_permissions_domain', table_name='permissions')
    op.drop_index('ix_permissions_key', table_name='permissions')
    op.drop_table('permissions')
