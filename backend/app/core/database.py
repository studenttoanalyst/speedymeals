"""
Database connection setup — SQLAlchemy engine + session.
Every route that needs DB access uses the get_db() dependency below,
never creates its own connection.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models (in modules/*, platform/*) will inherit from this Base.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency — gives each request its own DB session,
    always closes it after, even if request errors out.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
