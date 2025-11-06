#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["youtube-transcript-api"]
# ///

"""Fetch a YouTube transcript for a given video ID.

Usage:
    fetch_youtube_transcript.py VIDEO_ID [--language en --language es]

The script prefers human-authored captions when available and falls back to
auto-generated tracks. Results are emitted as JSON to stdout.
"""

from __future__ import annotations

import argparse
import json
import locale
import sys
from typing import Iterable, List

from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeRequestFailed,
    YouTubeTranscriptApi,
)


def _language_preferences(explicit: Iterable[str] | None) -> List[str]:
    if explicit:
        return [code.lower() for code in explicit if code]

    preferred: List[str] = []
    locale_lang, _ = locale.getdefaultlocale() or (None, None)
    if locale_lang:
        preferred.append(locale_lang.lower())
    preferred.append("en")
    return preferred


def fetch_transcript(video_id: str, languages: Iterable[str] | None):
    preferences = _language_preferences(languages)
    api = YouTubeTranscriptApi()

    try:
        fetched = api.fetch(
            video_id,
            languages=preferences,
            preserve_formatting=True,
        )
    except NoTranscriptFound:
        transcripts = api.list(video_id)
        try:
            fetched = next(iter(transcripts)).fetch(preserve_formatting=True)
        except StopIteration as exc:  # pragma: no cover
            raise NoTranscriptFound(video_id, preferences, transcripts) from exc

    return {
        "video_id": fetched.video_id,
        "language": fetched.language,
        "language_code": fetched.language_code,
        "is_generated": fetched.is_generated,
        "segments": fetched.to_raw_data(),
    }


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch a YouTube transcript")
    parser.add_argument("video_id", help="The 11-character YouTube video identifier")
    parser.add_argument(
        "--language",
        action="append",
        dest="languages",
        help="Preferred language code (may be specified multiple times)",
    )

    args = parser.parse_args(argv)

    try:
        payload = fetch_transcript(args.video_id, args.languages)
    except (TranscriptsDisabled, NoTranscriptFound) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2
    except (VideoUnavailable, YouTubeRequestFailed) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 3
    except Exception as exc:  # pragma: no cover
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1

    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
