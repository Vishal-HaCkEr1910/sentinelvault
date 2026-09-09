"""
seed.py
=======
Populates a fresh database with demo users (one per role), two case files,
and issues PKI certificates for everyone. Run this once before the CLI demo,
the API, or the Streamlit dashboard.

    python seed.py

All demo passwords are `password123` — obviously never do this in a real
deployment; it's fine here because every "user" is a fictional demo persona.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from core.db import init_db, get_session
from core.models import User, CaseFile
from core.services import AuthService, bootstrap

DEMO_PASSWORD = "password123"

DEMO_USERS = [
    # username, full_name, role, department, employee_id, assigned_case_ids
    ("io_sharma", "Insp. Sharma", "InvestigatingOfficer", "Cybercrime Cell", "IO-1042", [1]),
    ("io_verma", "SI Verma", "InvestigatingOfficer", "Cybercrime Cell", "IO-1077", [1, 2]),
    ("prosecutor_rao", "Adv. Rao", "Prosecutor", "State Prosecution", "PR-0231", [1]),
    ("judge_mehta", "Justice Mehta", "Judge", "District Court", "JD-0009", []),
    ("clerk_das", "Clerk Das", "Clerk", "Court Registry", "CL-0456", [1, 2]),
    ("forensic_iyer", "Dr. Iyer", "ForensicAnalyst", "Forensic Science Lab", "FA-0812", [2]),
    ("admin", "System Admin", "Admin", "IT Cell", "AD-0001", []),
]

DEMO_CASES = [
    ("FIR-2024-1123", "State vs. Unknown - Cyber Fraud, Sector 21 Branch"),
    ("FIR-2024-1198", "State vs. R. Kapoor - Data Theft Investigation"),
]


def run():
    init_db()
    session = get_session()
    bootstrap(session)

    if session.query(User).count() > 0:
        print("Database already seeded (users exist). Skipping.")
        session.close()
        return

    case_ids = {}
    for case_number, title in DEMO_CASES:
        case = CaseFile(case_number=case_number, title=title)
        session.add(case)
        session.commit()
        case_ids[case_number] = case.id
        print(f"Created case {case_number} (id={case.id}): {title}")

    number_to_id = {i + 1: case_ids[num] for i, (num, _) in enumerate(DEMO_CASES)}

    for username, full_name, role, department, employee_id, case_refs in DEMO_USERS:
        real_case_ids = [number_to_id[r] for r in case_refs]
        AuthService.create_user(
            session, username=username, full_name=full_name, password=DEMO_PASSWORD,
            role=role, department=department, employee_id=employee_id, assigned_case_ids=real_case_ids,
        )
        print(f"Created user {username:16s} role={role:22s} cases={real_case_ids}")

    session.close()
    print("\nSeed complete. All demo users share the password:", DEMO_PASSWORD)


if __name__ == "__main__":
    run()
