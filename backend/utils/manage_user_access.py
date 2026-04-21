"""Manual user approval and role management for the auth catalog."""

from __future__ import annotations

import argparse
import os
import sys

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from datara.services.sql_store import SQLStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage Datara auth users")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List known users")

    approve = subparsers.add_parser("approve", help="Approve a user by email or Entra object id")
    approve.add_argument("user_ref")

    reject = subparsers.add_parser("reject", help="Reject or deactivate a user by email or Entra object id")
    reject.add_argument("user_ref")

    promote = subparsers.add_parser("promote", help="Promote a user to admin")
    promote.add_argument("user_ref")

    demote = subparsers.add_parser("demote", help="Demote an admin back to user")
    demote.add_argument("user_ref")

    return parser.parse_args()


def print_user(user: dict[str, object]) -> None:
    status = "approved" if user["approved"] else "pending"
    print(
        f"{user['email']:<36} "
        f"role={user['role']:<5} "
        f"status={status:<8} "
        f"slug={user['storage_slug']:<20} "
        f"entra={user['entra_object_id']}"
    )


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
        user = store.set_user_approval(args.user_ref, True)
    elif args.command == "reject":
        user = store.set_user_approval(args.user_ref, False)
    elif args.command == "promote":
        user = store.set_user_role(args.user_ref, "admin")
    else:
        user = store.set_user_role(args.user_ref, "user")

    if not user:
        print(f"No user found for {args.user_ref}")
        sys.exit(1)

    print_user(user)


if __name__ == "__main__":
    main()
