"""
Guards against model/migration drift: every table and column declared on a
SQLAlchemy model must exist in the database that `alembic upgrade head`
produces. (A missing riders.commission_rate once made every rider query fail on
a freshly migrated database.) Only missing tables/columns are asserted;
cosmetic constraint/index differences are ignored on purpose.
"""
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext

from app.core.database import Base, engine
# Import every model module so Base.metadata is complete.
from app.modules.admin_roles import models as _admin_roles  # noqa: F401
from app.modules.food_delivery import models as _food  # noqa: F401
from app.platform.account_deletion import models as _account_deletion  # noqa: F401
from app.platform.auth import models as _auth  # noqa: F401
from app.platform.notification import models as _notification  # noqa: F401
from app.platform.users import models as _users  # noqa: F401
from app.platform.wallet_payment import models as _wallet  # noqa: F401


def test_every_model_table_and_column_exists_in_the_migrated_database():
    with engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"compare_type": False})
        diffs = compare_metadata(context, Base.metadata)

    missing = []
    for diff in diffs:
        if diff[0] == "add_table":
            missing.append(f"table {diff[1].name}")
        elif diff[0] == "add_column":
            missing.append(f"column {diff[2]}.{diff[3].name}")
    assert not missing, f"models declare schema that no migration creates: {missing}"
