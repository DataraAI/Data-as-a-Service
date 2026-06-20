"""RabbitMQ publisher adapter for generation jobs."""

from __future__ import annotations

from typing import Any

from datara.celery_app import celery_app
from datara.config import settings


class LambdaJobPublisher:
    def publish(self, message: dict[str, Any]) -> str:
        result = celery_app.send_task(
            "datara.execute_lambda_job",
            kwargs=message,
            queue=settings.celery_queue_name,
        )
        return str(result.id)
