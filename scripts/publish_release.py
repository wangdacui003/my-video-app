import argparse
import json
import subprocess
from pathlib import Path


def run(args, check=True):
    return subprocess.run(args, check=check, text=True, capture_output=True)


def release_exists(tag):
    return run(["gh", "release", "view", tag], check=False).returncode == 0


def apk_target(name):
    return "tv" if "-tv-" in name else "mobile"


def apk_arch(name):
    return "arm64" if "-arm64-" in name else "armv7"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", default="dist")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args()

    dist = Path(args.dist)
    info = json.loads((dist / "build-info.json").read_text(encoding="utf-8"))
    version_name = str(info.get("versionName") or "1.0.0")
    version_code = int(info.get("versionCode") or 1)
    tag = f"aimoyu-v{version_name}-{version_code}"

    notes = dist / "release-notes.md"
    notes.write_text(
        "\n".join(
            [
                "AiMoYu APK",
                "",
                f"- Version: {version_name} ({version_code})",
                f"- Platform: {info.get('platform', '-')}",
                f"- Architecture: {info.get('architecture', '-')}",
                f"- Build type: {info.get('buildType', '-')}",
                f"- Signing mode: {info.get('signingMode', '-')}",
                f"- Build run: https://github.com/{args.repo}/actions/runs/{args.run_id}",
                "",
            ]
        ),
        encoding="utf-8",
    )

    title = f"AiMoYu {version_name} ({version_code})"
    if release_exists(tag):
        run(["gh", "release", "edit", tag, "--title", title, "--notes-file", str(notes)])
    else:
        run(["gh", "release", "create", tag, "--title", title, "--notes-file", str(notes)])

    upload = ["gh", "release", "upload", tag, "--clobber"]
    upload.extend(str(item) for item in sorted(dist.glob("*.apk")))
    upload.extend([str(dist / "checksums.sha256"), str(dist / "build-info.json")])
    run(upload)

    manifest = {
        "code": version_code,
        "name": version_name,
        "desc": "AiMoYu app update.",
        "versionCode": version_code,
        "versionName": version_name,
        "force": False,
        "description": "AiMoYu app update.",
        "publishedAt": info.get("createdAt", ""),
        "mobile": {},
        "tv": {},
    }

    for apk in sorted(dist.glob("*.apk")):
        target = apk_target(apk.name)
        arch = apk_arch(apk.name)
        url = f"https://github.com/{args.repo}/releases/download/{tag}/{apk.name}"
        manifest[target][arch] = {
            "name": apk.name,
            "url": url,
            "size": apk.stat().st_size,
        }
        if target == "mobile" and arch == "arm64":
            manifest["url"] = url

    out = Path("tv/update.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
