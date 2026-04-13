"""YouTube search and download service."""

import glob
import json
import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional

import requests

from datara.logging import logger

_YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
_YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
_VIDEO_EXTENSIONS = {".mp4", ".m4v", ".mov", ".mkv", ".webm"}


def _parse_iso8601_duration(duration: str) -> Optional[int]:
    """
    Parse a subset of ISO-8601 durations used by YouTube, e.g. PT1H2M3S.
    Returns total seconds.
    """
    if not duration:
        return None

    match = re.fullmatch(
        r"P(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)",
        duration,
    )
    if not match:
        return None

    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)
    return hours * 3600 + minutes * 60 + seconds


def _format_duration(seconds: Optional[int]) -> Optional[str]:
    if seconds is None:
        return None

    hours, remainder = divmod(int(seconds), 3600)
    minutes, secs = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


class YouTubeService:
    """Service for YouTube Data API search and yt-dlp download."""

    def __init__(self) -> None:
        self.api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
        self.timeout_seconds = int(os.getenv("YOUTUBE_API_TIMEOUT_SECONDS", "20"))

    def _require_api_key(self) -> None:
        if not self.api_key:
            raise RuntimeError(
                "YOUTUBE_API_KEY is not configured on the backend. "
                "Add it to your backend environment before using YouTube search."
            )

    def search_videos(self, query: Any, max_results: Any = 12) -> List[Dict[str, Any]]:
        self._require_api_key()

        search_query = str(query or "").strip()
        if not search_query:
            raise ValueError("Search query cannot be empty.")

        try:
            limit = int(max_results)
        except (TypeError, ValueError):
            limit = 12
        limit = max(1, min(limit, 25))

        response = requests.get(
            _YOUTUBE_SEARCH_URL,
            params={
                "part": "snippet",
                "q": search_query,
                "type": "video",
                "maxResults": limit,
                "key": self.api_key,
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()

        items = payload.get("items", [])
        video_ids = [
            item.get("id", {}).get("videoId")
            for item in items
            if item.get("id", {}).get("videoId")
        ]
        details_map = self._fetch_video_details(video_ids)

        results: List[Dict[str, Any]] = []
        for item in items:
            video_id = item.get("id", {}).get("videoId")
            if not video_id:
                continue

            snippet = item.get("snippet", {})
            thumbnails = snippet.get("thumbnails", {})
            thumbnail = (
                thumbnails.get("medium")
                or thumbnails.get("high")
                or thumbnails.get("default")
                or {}
            )
            details = details_map.get(video_id, {})

            results.append(
                {
                    "id": video_id,
                    "title": snippet.get("title"),
                    "description": snippet.get("description"),
                    "channel_title": snippet.get("channelTitle"),
                    "published_at": snippet.get("publishedAt"),
                    "thumbnail_url": thumbnail.get("url"),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "duration_seconds": details.get("duration_seconds"),
                    "duration_label": details.get("duration_label"),
                }
            )

        logger.info(f"YouTube search returned {len(results)} results for query '{search_query}'")
        return results

    def _fetch_video_details(self, video_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        if not video_ids:
            return {}

        response = requests.get(
            _YOUTUBE_VIDEOS_URL,
            params={
                "part": "contentDetails",
                "id": ",".join(video_ids),
                "key": self.api_key,
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()

        details_map: Dict[str, Dict[str, Any]] = {}
        for item in payload.get("items", []):
            video_id = item.get("id")
            content_details = item.get("contentDetails", {})
            duration_seconds = _parse_iso8601_duration(content_details.get("duration"))
            details_map[video_id] = {
                "duration_seconds": duration_seconds,
                "duration_label": _format_duration(duration_seconds),
            }

        return details_map

    def fetch_video_metadata(self, video_url: str) -> Dict[str, Any]:
        url = str(video_url or "").strip()
        if not url:
            raise ValueError("Missing YouTube video URL.")

        command = [
            sys.executable,
            "-m",
            "yt_dlp",
            "--dump-single-json",
            "--no-warnings",
            "--no-playlist",
            url,
        ]
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            stdout = (result.stdout or "").strip()
            raise RuntimeError(
                stderr
                or stdout
                or "yt-dlp could not read the YouTube video metadata."
            )

        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError("yt-dlp returned invalid metadata JSON.") from exc

    def download_video(self, video_url: str, output_dir: str) -> str:
        url = str(video_url or "").strip()
        if not url:
            raise ValueError("Missing YouTube video URL.")

        os.makedirs(output_dir, exist_ok=True)
        output_template = os.path.join(output_dir, "source.%(ext)s")

        command = [
            sys.executable,
            "-m",
            "yt_dlp",
            "--no-playlist",
            "--no-warnings",
            "-f",
            "bestvideo*+bestaudio/best",
            "--merge-output-format",
            "mp4",
            "-o",
            output_template,
            url,
        ]
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            stdout = (result.stdout or "").strip()
            raise RuntimeError(
                stderr
                or stdout
                or "yt-dlp failed to download the selected YouTube video."
            )

        downloaded_path = self._find_downloaded_video(output_dir)
        if not downloaded_path:
            raise RuntimeError("yt-dlp completed, but no downloaded video file was found.")

        logger.info(f"Downloaded YouTube video to {downloaded_path}")
        return downloaded_path

    def _find_downloaded_video(self, output_dir: str) -> Optional[str]:
        candidates = []
        for path in glob.glob(os.path.join(output_dir, "source*")):
            if not os.path.isfile(path):
                continue

            suffix = os.path.splitext(path)[1].lower()
            if suffix not in _VIDEO_EXTENSIONS:
                continue
            if path.endswith(".part"):
                continue

            candidates.append(path)

        if not candidates:
            return None

        candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
        return candidates[0]
