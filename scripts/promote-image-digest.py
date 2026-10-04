#!/usr/bin/env python3
"""security-10042026-Maurice: deterministic, digest-only GitOps promotion edit."""
import argparse
import re
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--environment", choices=("dev", "staging", "prod"), required=True)
parser.add_argument("--component", choices=("backend", "storefront", "admin"), required=True)
parser.add_argument("--repository", required=True)
parser.add_argument("--digest", required=True)
args = parser.parse_args()


def trace(event: str, **fields: str) -> None:
    """Emit bounded structured diagnostics without credentials or source contents."""
    print(json.dumps({"event": event, **fields}, sort_keys=True))


def fail(message: str) -> "NoReturn":
    print(json.dumps({"level": "error", "event": "promotion.failure", "operation": "digest_promotion", "message": message[:300]}), file=sys.stderr)
    raise SystemExit(1)


if not re.fullmatch(r"sha256:[0-9a-f]{64}", args.digest):
    fail("digest must be a lowercase SHA-256 digest")
path = Path("platform/gitops/promotion") / f"{args.environment}.yaml"
text = path.read_text()
updated, count = re.subn(rf"(?m)^  {re.escape(args.component)}:.*$", f'  {args.component}: {{ repository: {args.repository}, tag: "", digest: "{args.digest}" }}', text)
if count != 1:
    fail(f"expected exactly one {args.component} promotion entry")
path.write_text(updated)
trace("promotion_digest_written", environment=args.environment, component=args.component, digest=args.digest)
