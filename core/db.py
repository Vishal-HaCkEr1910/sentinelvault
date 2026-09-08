"""
db.py
=====
SQLite engine + session factory. Swap SQLALCHEMY_URL for a PostgreSQL DSN
to move to a real deployment — nothing in core/services.py or above needs
to change, since everything talks to the DB through SQLAlchemy sessions.
"""
from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.models import Base

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

SQLALCHEMY_URL = f"sqlite:///{os.path.join(DATA_DIR, 'sentinelvault.db')}"

engine = create_engine(SQLALCHEMY_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    Base.metadata.create_all(engine)


def get_session():
    return SessionLocal()
