"""
Integration and unit tests for Admin RBAC, Staff Provisioning, and Forgot Password Flows.
Zero em-dash compliant.
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db
from app.core.security import hash_password
from app.platform.auth.models import Admin, RefreshToken
from app.modules.food_delivery.models import Restaurant
from app.modules.admin_roles.models import AdminRole, Permission


@pytest.fixture
def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def superadmin_headers(client, db_session):
    """Seed or fetch superadmin and generate auth header."""
    superadmin_role = db_session.query(AdminRole).filter(AdminRole.slug == "superadmin").first()
    email = f"superadmin-{uuid.uuid4().hex[:6]}@speedymeals.pk"
    admin = Admin(
        email=email,
        password_hash=hash_password("SuperSecret@123"),
        role="super_admin",
        role_id=superadmin_role.id if superadmin_role else None,
        first_name="Test",
        last_name="SuperAdmin",
        is_active=True,
        must_change_password=False,
    )
    db_session.add(admin)
    db_session.commit()

    res = client.post("/auth/admin/login", json={"email": email, "password": "SuperSecret@123"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_forgot_and_reset_password(client, db_session):
    """Test full forgot-password and reset-password cycle for admin account."""
    email = f"admin-reset-{uuid.uuid4().hex[:6]}@speedymeals.pk"
    admin = Admin(
        email=email,
        password_hash=hash_password("OldPassword@123"),
        role="admin",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    # 1. Request reset
    req_res = client.post("/auth/admin/forgot-password", json={"email": email})
    assert req_res.status_code == 200
    data = req_res.json()
    assert data["reset_token"] is not None
    token = data["reset_token"]

    # 2. Reset password
    reset_res = client.post("/auth/admin/reset-password", json={"token": token, "new_password": "NewSecretPassword@999"})
    assert reset_res.status_code == 200
    assert "successfully reset" in reset_res.json()["message"]

    # 3. Old password should fail
    fail_res = client.post("/auth/admin/login", json={"email": email, "password": "OldPassword@123"})
    assert fail_res.status_code == 401

    # 4. New password should succeed
    ok_res = client.post("/auth/admin/login", json={"email": email, "password": "NewSecretPassword@999"})
    assert ok_res.status_code == 200
    assert "access_token" in ok_res.json()


def test_restaurant_forgot_and_reset_password(client, db_session):
    """Test full forgot-password and reset-password cycle for restaurant account."""
    unique = uuid.uuid4().hex[:8]
    email = f"rest-reset-{unique}@speedymeals.pk"
    restaurant = Restaurant(
        name="Forgot PW Test Cafe",
        email=email,
        password_hash=hash_password("RestOld@123"),
        phone_number=f"+92319{unique}",
        commission_rate=10,
        status="active",
        latitude=31.53,
        longitude=74.36,
        country_code="+92",
        currency="PKR",
    )
    db_session.add(restaurant)
    db_session.commit()

    # 1. Request reset
    req_res = client.post("/auth/restaurant/forgot-password", json={"email": email})
    assert req_res.status_code == 200
    token = req_res.json()["reset_token"]
    assert token is not None

    # 2. Reset password
    reset_res = client.post("/auth/restaurant/reset-password", json={"token": token, "new_password": "RestNewPassword@456"})
    assert reset_res.status_code == 200

    # 3. Old password fails
    fail_res = client.post("/auth/restaurant/login", json={"email": email, "password": "RestOld@123"})
    assert fail_res.status_code == 401

    # 4. New password succeeds
    ok_res = client.post("/auth/restaurant/login", json={"email": email, "password": "RestNewPassword@456"})
    assert ok_res.status_code == 200
    assert "access_token" in ok_res.json()


def test_admin_roles_management(client, superadmin_headers, db_session):
    """Test listing permissions, creating custom role, updating, and deleting."""
    # 1. List permissions
    perm_res = client.get("/admin/permissions", headers=superadmin_headers)
    assert perm_res.status_code == 200
    perms = perm_res.json()
    assert len(perms) >= 35

    # 2. Create custom role
    create_payload = {
        "name": f"Operations Lead {uuid.uuid4().hex[:4]}",
        "color": "#10B981",
        "icon": "Truck",
        "permission_keys": ["orders.view", "orders.cancel", "riders.view", "riders.live_fleet.view"],
    }
    create_res = client.post("/admin/roles", json=create_payload, headers=superadmin_headers)
    assert create_res.status_code == 201
    created_role = create_res.json()
    role_id = created_role["id"]
    assert created_role["name"] == create_payload["name"]
    assert len(created_role["permissions"]) == 4

    # 3. Update role
    update_res = client.patch(
        f"/admin/roles/{role_id}",
        json={"color": "#F59E0B", "permission_keys": ["orders.view", "riders.view"]},
        headers=superadmin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["color"] == "#F59E0B"
    assert len(update_res.json()["permissions"]) == 2

    # 4. Delete role
    del_res = client.delete(f"/admin/roles/{role_id}", headers=superadmin_headers)
    assert del_res.status_code == 200

    # 5. System roles cannot be deleted
    superadmin_role = db_session.query(AdminRole).filter(AdminRole.slug == "superadmin").first()
    bad_del = client.delete(f"/admin/roles/{superadmin_role.id}", headers=superadmin_headers)
    assert bad_del.status_code == 400


def test_admin_staff_provisioning_and_first_login(client, superadmin_headers, db_session):
    """Test provisioning staff account, auto email generation, temp password, and forced rotation."""
    support_role = db_session.query(AdminRole).filter(AdminRole.slug == "support").first()

    # 1. Provision staff
    first_name = "Tariq"
    last_name = "Mahmood"
    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "role_id": str(support_role.id),
        "phone": "+923001234567",
    }
    prov_res = client.post("/admin/accounts", json=payload, headers=superadmin_headers)
    assert prov_res.status_code == 201
    prov_data = prov_res.json()

    generated_email = prov_data["admin"]["email"]
    assert "tariq.mahmood" in generated_email
    temp_pass = prov_data["temporary_password"]
    assert len(temp_pass) >= 16

    # 2. Staff logs in with temporary password
    login_res = client.post("/auth/admin/login", json={"email": generated_email, "password": temp_pass})
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["must_change_password"] is True
    temp_token = login_data["access_token"]

    # 3. Staff rotates initial password
    rot_headers = {"Authorization": f"Bearer {temp_token}"}
    rot_res = client.post("/auth/admin/change-initial-password", json={"new_password": "PermanentSecret@789"}, headers=rot_headers)
    assert rot_res.status_code == 200
    assert rot_res.json()["must_change_password"] is False

    # 4. Subsequent login has must_change_password = False
    new_login = client.post("/auth/admin/login", json={"email": generated_email, "password": "PermanentSecret@789"})
    assert new_login.status_code == 200
    assert new_login.json()["must_change_password"] is False
