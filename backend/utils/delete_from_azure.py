"""
Delete dataset assets from Azure Blob Storage and Cosmos DB.

Examples:
    python backend/utils/delete_from_azure.py --dataset bmw_front --dry_run
    python backend/utils/delete_from_azure.py --dataset bmw_front --view orig --dry_run
    python backend/utils/delete_from_azure.py --tag grille
    python backend/utils/delete_from_azure.py --dataset bmw_front --tag grille --view egos

Safety:
- Requires at least one filter: --dataset, --tag, or --view
- Queries Cosmos DB first and only deletes matching blobs/documents
- Supports dry-run mode
"""

import argparse
import os
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
from azure.cosmos import CosmosClient
from azure.cosmos.exceptions import CosmosResourceNotFoundError


COSMOS_ENDPOINT_DEFAULT = "https://daas-blob-annotations.documents.azure.com:443/"
COSMOS_DATABASE = "BlobAnnotations"
COSMOS_CONTAINER = "roboteyeview"
BLOB_CONTAINER_DEFAULT = "roboteyeview"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Delete matching data from Azure Blob Storage and Cosmos DB"
    )
    parser.add_argument("--dataset", type=str, default="", help="Match c.datasetName")
    parser.add_argument("--tag", type=str, default="", help="Match a value inside c.miscTags")
    parser.add_argument(
        "--view",
        type=str,
        choices=["orig", "egos"],
        default="",
        help="Match a dataset view (orig or egos)",
    )
    parser.add_argument(
        "--dry_run",
        action="store_true",
        help="Preview matches without deleting anything",
    )
    return parser.parse_args()


def require_filter(args: argparse.Namespace) -> None:
    if not args.dataset and not args.tag and not args.view:
        raise ValueError(
            "Refusing to run without filters. Provide at least one of: "
            "--dataset, --tag, --view"
        )


def cosmos_view_value(view: str) -> str:
    # Upload script stores orig as exo in Cosmos DB.
    if view == "orig":
        return "exo"
    return view


def build_cosmos_query(dataset: str, tag: str, view: str) -> Tuple[str, List[Dict[str, Any]]]:
    clauses: List[str] = []
    parameters: List[Dict[str, Any]] = []

    if dataset:
        clauses.append("c.datasetName = @dataset")
        parameters.append({"name": "@dataset", "value": dataset})

    if tag:
        clauses.append("ARRAY_CONTAINS(c.miscTags, @tag)")
        parameters.append({"name": "@tag", "value": tag})

    if view:
        clauses.append("c.view = @view")
        parameters.append({"name": "@view", "value": cosmos_view_value(view)})

    query = "SELECT * FROM c WHERE " + " AND ".join(clauses)
    return query, parameters


def build_clients() -> Tuple[Any, Any]:
    load_dotenv()

    connection_string = os.getenv("BLOB_CONNECTION_STRING") or os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise ValueError(
            "Missing blob connection string. Set BLOB_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING."
        )

    cosmos_endpoint = os.getenv("COSMOS_ENDPOINT") or os.getenv("AZURE_COSMOS_ENDPOINT") or COSMOS_ENDPOINT_DEFAULT
    cosmos_key = os.getenv("COSMOS_DB_KEY") or os.getenv("AZURE_COSMOS_KEY")
    if not cosmos_key:
        raise ValueError("Missing Cosmos key. Set COSMOS_DB_KEY or AZURE_COSMOS_KEY.")

    container_name = os.getenv("AZURE_BLOB_CONTAINER", BLOB_CONTAINER_DEFAULT)

    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    blob_container = blob_service_client.get_container_client(container_name)

    cosmos_client = CosmosClient(cosmos_endpoint, credential=cosmos_key)
    cosmos_database = cosmos_client.get_database_client(COSMOS_DATABASE)
    cosmos_container = cosmos_database.get_container_client(COSMOS_CONTAINER)

    return blob_container, cosmos_container


def get_partition_key_field(cosmos_container: Any) -> Optional[str]:
    try:
        properties = cosmos_container.read()
        paths = properties.get("partitionKey", {}).get("paths", [])
        if not paths:
            return None
        return paths[0].lstrip("/")
    except Exception:
        return None


def get_partition_key_value(doc: Dict[str, Any], partition_key_field: Optional[str]) -> Any:
    if not partition_key_field:
        return doc["id"]
    if partition_key_field not in doc:
        raise KeyError(
            f"Document {doc.get('id')} is missing partition key field '{partition_key_field}'"
        )
    return doc[partition_key_field]


def query_matching_docs(
    cosmos_container: Any,
    dataset: str,
    tag: str,
    view: str,
) -> List[Dict[str, Any]]:
    query, parameters = build_cosmos_query(dataset=dataset, tag=tag, view=view)
    return list(
        cosmos_container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True,
        )
    )


def collect_blob_paths(docs: List[Dict[str, Any]]) -> List[str]:
    return sorted({doc.get("blobPath") for doc in docs if doc.get("blobPath")})


def delete_blobs(blob_container: Any, blob_paths: List[str], dry_run: bool) -> Dict[str, int]:
    summary = {"matched": len(blob_paths), "deleted": 0, "missing": 0, "failed": 0}

    for blob_path in blob_paths:
        if dry_run:
            print(f"[DRY RUN] Would delete blob: {blob_path}")
            continue

        try:
            blob_container.delete_blob(blob_path)
            print(f"Deleted blob: {blob_path}")
            summary["deleted"] += 1
        except ResourceNotFoundError:
            print(f"Blob not found, skipping: {blob_path}")
            summary["missing"] += 1
        except Exception as exc:
            print(f"Failed to delete blob {blob_path}: {exc}")
            summary["failed"] += 1

    return summary


def delete_cosmos_docs(cosmos_container: Any, docs: List[Dict[str, Any]], dry_run: bool) -> Dict[str, int]:
    summary = {"matched": len(docs), "deleted": 0, "missing": 0, "failed": 0}
    partition_key_field = get_partition_key_field(cosmos_container)

    for doc in docs:
        doc_id = doc.get("id")
        blob_path = doc.get("blobPath")

        if dry_run:
            print(f"[DRY RUN] Would delete Cosmos doc: id={doc_id}, blobPath={blob_path}")
            continue

        try:
            partition_key = get_partition_key_value(doc, partition_key_field)
            cosmos_container.delete_item(item=doc_id, partition_key=partition_key)
            print(f"Deleted Cosmos doc: id={doc_id}, blobPath={blob_path}")
            summary["deleted"] += 1
        except CosmosResourceNotFoundError:
            print(f"Cosmos doc not found, skipping: id={doc_id}")
            summary["missing"] += 1
        except Exception as exc:
            print(f"Failed to delete Cosmos doc id={doc_id}: {exc}")
            summary["failed"] += 1

    return summary


def print_match_preview(docs: List[Dict[str, Any]], blob_paths: List[str], dry_run: bool) -> None:
    print("=== Match Summary ===")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE DELETE'}")
    print(f"Matching Cosmos documents: {len(docs)}")
    print(f"Unique blob paths: {len(blob_paths)}")

    preview_count = min(10, len(blob_paths))
    if preview_count:
        print("Preview of blob paths:")
        for blob_path in blob_paths[:preview_count]:
            print(f"  - {blob_path}")
        if len(blob_paths) > preview_count:
            print(f"  ... and {len(blob_paths) - preview_count} more")
    print()


def print_final_summary(
    args: argparse.Namespace,
    docs: List[Dict[str, Any]],
    blob_paths: List[str],
    blob_summary: Dict[str, int],
    cosmos_summary: Dict[str, int],
) -> None:
    print("\n=== Final Summary ===")
    print(f"dataset filter: {args.dataset or '(none)'}")
    print(f"tag filter:     {args.tag or '(none)'}")
    print(f"view filter:    {args.view or '(none)'}")
    print(f"mode:           {'DRY RUN' if args.dry_run else 'LIVE DELETE'}")
    print()
    print(f"matched documents: {len(docs)}")
    print(f"unique blob paths: {len(blob_paths)}")
    print()
    print("Blob Storage:")
    print(f"  matched: {blob_summary['matched']}")
    print(f"  deleted: {blob_summary['deleted']}")
    print(f"  missing: {blob_summary['missing']}")
    print(f"  failed:  {blob_summary['failed']}")
    print()
    print("Cosmos DB:")
    print(f"  matched: {cosmos_summary['matched']}")
    print(f"  deleted: {cosmos_summary['deleted']}")
    print(f"  missing: {cosmos_summary['missing']}")
    print(f"  failed:  {cosmos_summary['failed']}")

    if args.dry_run:
        print("\nNo data was deleted because --dry_run was used.")


def main() -> None:
    args = parse_args()
    require_filter(args)

    blob_container, cosmos_container = build_clients()

    docs = query_matching_docs(
        cosmos_container=cosmos_container,
        dataset=args.dataset,
        tag=args.tag,
        view=args.view,
    )

    if not docs:
        print("No matching Cosmos documents found. Nothing to delete.")
        return

    blob_paths = collect_blob_paths(docs)
    print_match_preview(docs, blob_paths, args.dry_run)

    blob_summary = delete_blobs(
        blob_container=blob_container,
        blob_paths=blob_paths,
        dry_run=args.dry_run,
    )

    cosmos_summary = delete_cosmos_docs(
        cosmos_container=cosmos_container,
        docs=docs,
        dry_run=args.dry_run,
    )

    print_final_summary(args, docs, blob_paths, blob_summary, cosmos_summary)


if __name__ == "__main__":
    main()
