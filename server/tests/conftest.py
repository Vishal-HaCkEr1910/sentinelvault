import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "test_sentinelvault.db")


@pytest.fixture()
def fresh_db():
    """
    A completely isolated SQLite database for this test, SEPARATE from the
    demo database that `seed.py` / `cli_demo.py` / the dashboard / the API
    all share (data/sentinelvault.db). Running the test suite must never
    wipe out demo data someone seeded for a live walkthrough.
    """
    from core import db as db_module
    from core.models import Base
    from core.services import bootstrap

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

    test_engine = create_engine(f"sqlite:///{TEST_DB_PATH}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(test_engine)
    TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    # Point the db module at the test engine for the duration of this test,
    # then restore it — every service function pulls sessions via db_module,
    # so this swap is all that's needed to redirect the whole app layer.
    original_engine = db_module.engine
    original_session_local = db_module.SessionLocal
    db_module.engine = test_engine
    db_module.SessionLocal = TestSessionLocal

    session = TestSessionLocal()
    bootstrap(session)
    yield session
    session.close()

    test_engine.dispose()
    db_module.engine = original_engine
    db_module.SessionLocal = original_session_local
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
