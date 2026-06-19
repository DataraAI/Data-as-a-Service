"""Celery application configuration for the generation worker."""

from __future__ import annotations

from celery import Celery

from datara.config import settings


celery_app = Celery("datara", broker=settings.celery_broker_url)
celery_app.conf.update(
    accept_content=["json"],
    broker_connection_retry_on_startup=True,
    broker_transport_options={"confirm_publish": True},
    enable_utc=True,
    result_backend=None,
    task_acks_late=True,
    task_default_delivery_mode=2,
    task_default_queue=settings.celery_queue_name,
    task_ignore_result=True,
    task_reject_on_worker_lost=True,
    task_serializer="json",
    timezone="UTC",
    worker_prefetch_multiplier=1,
)
