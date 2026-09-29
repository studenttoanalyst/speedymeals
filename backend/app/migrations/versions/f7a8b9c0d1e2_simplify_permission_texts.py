"""simplify permission texts for plain english comprehension

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-09-28 21:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SIMPLIFIED_PERMISSIONS = [
    # 1. Restaurants
    ("restaurants.view", "View Restaurants", "restaurants", "Browse restaurant list, contact numbers, ratings, and open or closed status."),
    ("restaurants.create", "Add New Restaurant", "restaurants", "Register new restaurant partner and set up their owner login account."),
    ("restaurants.edit_profile", "Edit Restaurant Details", "restaurants", "Update restaurant name, phone, address, and kitchen opening hours."),
    ("restaurants.toggle_status", "Open or Close Restaurant", "restaurants", "Temporarily pause or open a restaurant for customer orders."),
    ("restaurants.commission.view", "View Commission Rate", "restaurants", "See how much commission the platform charges this restaurant (e.g. 10%)."),
    ("restaurants.commission.edit", "Change Commission Rate", "restaurants", "Update the commission percentage charged to this restaurant."),
    ("restaurants.menu.view", "View Food Menu", "restaurants", "See food dishes, prices, categories, and item options."),
    ("restaurants.menu.manage", "Edit Food Menu", "restaurants", "Add new dishes, update food prices, upload food photos, or mark items sold out."),
    ("restaurants.credentials.reset", "Reset Restaurant Password", "restaurants", "Send a password reset link to the restaurant owner."),

    # 2. Riders
    ("riders.view", "View Rider Fleet", "riders", "See list of delivery riders, phone numbers, motorbike info, and wallet cash."),
    ("riders.approve", "Approve or Reject Rider", "riders", "Check rider CNIC ID card, driving license, and approve them to start working."),
    ("riders.toggle_status", "Activate or Block Rider", "riders", "Allow a rider to take delivery jobs or temporarily block their account."),
    ("riders.kit.manage", "Issue Uniform & Bag", "riders", "Give delivery shirts and food box to rider, and record Rs. 5,000 security deposit."),
    ("riders.live_fleet.view", "Live Rider Map", "riders", "See live GPS map of where riders are driving and who is currently available."),
    ("riders.documents.view_private", "View Rider ID & License", "riders", "View private photos of rider CNIC card and driving license documents."),

    # 3. Orders
    ("orders.view", "View Customer Orders", "orders", "See all customer food orders, food items ordered, and delivery addresses."),
    ("orders.cancel", "Cancel Customer Order", "orders", "Cancel an ongoing order and return payment to the customer."),
    ("orders.reassign_rider", "Change Assigned Rider", "orders", "Pick a different rider for an order if the first rider cannot deliver it."),
    ("orders.live_tracking.view", "Track Live Delivery", "orders", "Follow order progress step-by-step from kitchen cooking to customer doorstep."),
    ("orders.status.override", "Manual Order Status Fix", "orders", "Manually fix an order status if a rider or restaurant device has internet problems."),

    # 4. Finance
    ("finance.settlements.view", "View Restaurant Payouts", "finance", "Check how much money the platform owes each restaurant for weekly sales."),
    ("finance.settlements.generate", "Create Weekly Payout Bills", "finance", "Calculate weekly earnings and create payout sheets for restaurants."),
    ("finance.settlements.mark_paid", "Confirm Restaurant Paid", "finance", "Mark that the bank transfer has been sent to the restaurant bank account."),
    ("finance.rider_payouts.view", "View Rider Earnings", "finance", "See delivery fees earned by riders (Rs. 100 base fee + Rs. 25 per kilometer)."),
    ("finance.rider_payouts.generate", "Create Rider Pay Sheets", "finance", "Calculate weekly delivery earnings for all riders."),
    ("finance.rider_payouts.mark_paid", "Confirm Rider Paid", "finance", "Record payment sent to rider via Bank transfer, Easypaisa, or JazzCash."),
    ("finance.cash_discrepancies.view", "Check Cash on Delivery", "finance", "Compare cash collected from customers with cash deposited by riders at the office."),
    ("finance.cash_discrepancies.resolve", "Resolve Cash Difference", "finance", "Approve or adjust small cash differences when a rider deposits collected cash."),
    ("finance.wallet.adjust", "Adjust Rider Wallet Balance", "finance", "Add or deduct balance in rider app wallet (for bonus, deduction, or kit refund)."),

    # 5. Customers
    ("customers.view", "View Customers", "customers", "See registered customer names, phone numbers, and past order history."),
    ("customers.toggle_status", "Block or Unblock Customer", "customers", "Block fake or abusive customer accounts from placing orders."),
    ("customers.ratings.view", "View Customer Reviews", "customers", "Read customer ratings and star reviews for food and delivery speed."),
    ("customers.ratings.moderate", "Hide Abusive Reviews", "customers", "Remove inappropriate or insulting words from publicly visible reviews."),

    # 6. Marketing & Pricing
    ("marketing.promotions.view", "View Discount Codes", "marketing", "See active discount vouchers, coupon codes, and promotional banners."),
    ("marketing.promotions.manage", "Create Discount Code", "marketing", "Create new coupon codes, percentage discounts, and minimum order rules."),
    ("pricing.delivery_fee.view", "View Delivery Charges", "pricing", "See current delivery fee pricing formula (Rs. 100 base + Rs. 25 per kilometer)."),
    ("pricing.delivery_fee.edit", "Change Delivery Charges", "pricing", "Update base delivery price or kilometer rate charged to customers."),

    # 7. Analytics
    ("analytics.dashboard.view", "View Main Dashboard", "analytics", "See daily sales numbers, active deliveries, and platform performance graphs."),
    ("analytics.reports.export", "Download Excel/CSV Reports", "analytics", "Download sales, payout, and order records to open in Microsoft Excel."),
    ("analytics.audit_logs.view", "View Staff Activity Log", "analytics", "See who changed what on the platform, with exact dates and operator names."),

    # 8. Admins / Governance
    ("admins.roles.manage", "Create & Edit Staff Roles", "admins", "Create job roles, pick role icons, and choose what actions each role can perform."),
    ("admins.accounts.view", "View Staff Directory", "admins", "See all office staff accounts, their job roles, and login activity."),
    ("admins.accounts.create", "Add New Staff Member", "admins", "Create account for new office staff and give them their first-time login password."),
    ("admins.accounts.manage", "Edit Staff Member", "admins", "Update staff phone number, assign a different role, or pause their account."),
    ("admins.accounts.reset_credentials", "Reset Staff Password", "admins", "Create a new temporary password for a staff member and log them out of all devices."),
]


def upgrade() -> None:
    # Update permissions table rows
    permissions_table = sa.table(
        'permissions',
        sa.column('key', sa.String),
        sa.column('label', sa.String),
        sa.column('domain', sa.String),
        sa.column('description', sa.Text),
    )

    for key, label, domain, desc in SIMPLIFIED_PERMISSIONS:
        op.execute(
            permissions_table.update()
            .where(permissions_table.c.key == key)
            .values(label=label, domain=domain, description=desc)
        )

    # Mandatory AGENTS.md privileges maintenance
    op.execute("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;")
    op.execute("GRANT ALL ON TABLE public.permissions TO anon, authenticated, service_role;")
    op.execute("GRANT ALL ON TABLE public.admin_roles TO anon, authenticated, service_role;")


def downgrade() -> None:
    pass
