"""Manual user approval, role management, password resets, and safe deletions for Datara auth."""

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
    approve.add_argument("--actor", help="Approving user email or id. Defaults to the first approved admin.")

    reject = subparsers.add_parser("reject", help="Reject or deactivate a user by email or user id")
    reject.add_argument("user_ref")
    reject.add_argument("--actor", help="Rejecting user email or id. Defaults to the first approved admin.")

    promote = subparsers.add_parser("promote", help="Promote a user to admin")
    promote.add_argument("user_ref")
    promote.add_argument("--actor", help="Acting admin email or id. Defaults to the first approved admin.")

    analyst = subparsers.add_parser("make-analyst", help="Change a user role to analyst")
    analyst.add_argument("user_ref")
    analyst.add_argument("--actor", help="Acting admin email or id. Defaults to the first approved admin.")

    demote = subparsers.add_parser("demote", help="Demote a user back to customer")
    demote.add_argument("user_ref")
    demote.add_argument("--actor", help="Acting admin email or id. Defaults to the first approved admin.")

    set_role = subparsers.add_parser("set-role", help="Set an explicit role for a user")
    set_role.add_argument("user_ref")
    set_role.add_argument("role", choices=["customer", "analyst", "admin"])
    set_role.add_argument("--actor", help="Acting admin email or id. Defaults to the first approved admin.")

    set_password = subparsers.add_parser("set-password", help="Set or reset a user's password")
    set_password.add_argument("user_ref")
    set_password.add_argument("--password", help="New password. If omitted, you will be prompted securely.")

    delete_user = subparsers.add_parser("delete", help="Delete a user who has no dataset records")
    delete_user.add_argument("user_ref")

    return parser.parse_args()


def print_user(user: dict[str, object]) -> None:
    approver = user.get("approved_by_email") or "-"
    print(
        f"{str(user['email']):<36} "
        f"role={str(user['role']):<8} "
        f"status={str(user['approval_status']):<8} "
        f"approver={str(approver):<24} "
        f"slug={str(user['storage_slug']):<20} "
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


def resolve_actor_id(store: SQLStore, actor_ref: str | None) -> int:
    actor = store.get_user(actor_ref) if actor_ref else store.get_first_admin_user()
    if not actor:
        raise SystemExit("No approved admin account is available to record this action.")
    if actor["role"] != "admin" or actor["approval_status"] != "approved":
        raise SystemExit(f"{actor['email']} is not an approved admin account.")
    return int(actor["id"])


def main() -> None:
    args = parse_args()
    print(f"Using auth database: {settings.auth_database_label}")
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
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_approval_status(args.user_ref, "approved", actor_user_id=actor_id)
    elif args.command == "reject":
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_approval_status(args.user_ref, "rejected", actor_user_id=actor_id)
    elif args.command == "promote":
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_role(args.user_ref, "admin", actor_user_id=actor_id)
    elif args.command == "make-analyst":
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_role(args.user_ref, "analyst", actor_user_id=actor_id)
    elif args.command == "demote":
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_role(args.user_ref, "customer", actor_user_id=actor_id)
    elif args.command == "set-role":
        actor_id = resolve_actor_id(store, args.actor)
        user = store.set_user_role(args.user_ref, args.role, actor_user_id=actor_id)
    elif args.command == "delete":
        user = store.get_user(args.user_ref)
        if not user:
            print(f"No user found for {args.user_ref}")
            sys.exit(1)

        owned_count = store.count_owned_datasets(user["id"], include_deleted=True)
        if owned_count > 0:
            raise SystemExit(
                f"Cannot delete {user['email']}: {owned_count} dataset record(s) still reference this user."
            )

        deleted = store.delete_user(args.user_ref)
        if not deleted:
            print(f"No user found for {args.user_ref}")
            sys.exit(1)
        print(f"Deleted user {user['email']} ({user['id']})")
        return
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
