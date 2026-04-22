"""Manual user approval, role management, and password resets for Datara auth."""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from werkzeug.security import generate_password_hash

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.config import settings
from datara.services.sql_store import SQLStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage Datara auth users")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List known users")

    approve = subparsers.add_parser("approve", help="Approve a user by email or user id")
    approve.add_argument("user_ref")

    reject = subparsers.add_parser("reject", help="Reject or deactivate a user by email or user id")
    reject.add_argument("user_ref")

    promote = subparsers.add_parser("promote", help="Promote a user to admin")
    promote.add_argument("user_ref")

    demote = subparsers.add_parser("demote", help="Demote an admin back to user")
    demote.add_argument("user_ref")

    set_password = subparsers.add_parser("set-password", help="Set or reset a user's password")
    set_password.add_argument("user_ref")
    set_password.add_argument("--password", help="New password. If omitted, you will be prompted securely.")

    return parser.parse_args()


def print_user(user: dict[str, object]) -> None:
    print(
        f"{user['email']:<36} "
        f"role={user['role']:<5} "
        f"status={user['approval_status']:<8} "
        f"slug={user['storage_slug']:<20} "
        f"id={user['id']}"
    )


def prompt_for_password() -> str:
    first = getpass.getpass("New password: ")
    second = getpass.getpass("Confirm password: ")
    if first != second:
        raise SystemExit("Passwords did not match.")
    if len(first) < settings.auth_min_password_length:
        raise SystemExit(
            f"Password must be at least {settings.auth_min_password_length} characters long."
        )
    return first


def main() -> None:
    args = parse_args()
    store = SQLStore()

    if args.command == "list":
        users = store.list_users()
        if not users:
            print("No users in the catalog yet.")
            return
        for user in users:
            print_user(user)
        return

    if args.command == "approve":
        user = store.set_user_approval_status(args.user_ref, "approved")
    elif args.command == "reject":
        user = store.set_user_approval_status(args.user_ref, "rejected")
    elif args.command == "promote":
        user = store.set_user_role(args.user_ref, "admin")
    elif args.command == "demote":
        user = store.set_user_role(args.user_ref, "user")
    else:
        password = args.password or prompt_for_password()
        if len(password) < settings.auth_min_password_length:
            raise SystemExit(
                f"Password must be at least {settings.auth_min_password_length} characters long."
            )
        user = store.update_user_password(args.user_ref, generate_password_hash(password))

    if not user:
        print(f"No user found for {args.user_ref}")
        sys.exit(1)

    print_user(user)


if __name__ == "__main__":
    main()
