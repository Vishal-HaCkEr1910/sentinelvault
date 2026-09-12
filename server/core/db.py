"""PostgreSQL engine and SQLAlchemy session factory."""
from __future__ import annotations

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.models import Base

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SQLALCHEMY_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://luffy:luffy@localhost:5432/SentinelVault",
)

engine = create_engine(SQLALCHEMY_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    Base.metadata.create_all(engine)


def get_session():
    return SessionLocal()
