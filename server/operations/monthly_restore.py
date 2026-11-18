"""Check the daily archive in an offline, disposable PostgreSQL 16 instance."""
import datetime
import fcntl
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

DRIVE = Path("/Volumes/Toshiba")
ROOT = DRIVE / "knolstory-backups"
STATE = Path.home() / ".local/share/knolstory-next-production/restore-check"
VERIFY = """
set -eu
docker-entrypoint.sh postgres >/dev/null 2>&1 </dev/null &
server=$!
for attempt in $(seq 1 90); do
  kill -0 "$server" || exit 1
  pg_isready -q -h 127.0.0.1 -U postgres && break
  sleep 1
done
pg_restore --host=127.0.0.1 --username=postgres --dbname=postgres \
  --single-transaction --exit-on-error --no-owner --no-privileges
result=$(psql -XqAt -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
SELECT min(version) = 1 AND count(*) = max(version) AND
       to_regclass('knolstory_auth.accounts') IS NOT NULL AND
       to_regclass('knolstory_class.classrooms') IS NOT NULL
FROM knolstory_storage.migrations;
SQL
)
test "$result" = t
"""


def restore_archive(archive):
    with tempfile.TemporaryDirectory() as directory, archive.open("rb") as source:
        cidfile = Path(directory) / "container-id"
        command = [
            "docker", "run", "--rm", "--pull=never", "--interactive",
            "--cidfile", str(cidfile), "--network=none", "--log-driver=none",
            "--memory=2g", "--memory-swap=2g", "--cpus=1", "--pids-limit=200",
            "--tmpfs", "/var/lib/postgresql/data:size=1536m",
            "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-bookworm",
            "bash", "-c", VERIFY,
        ]
        try:
            subprocess.run(command, stdin=source, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, check=True, timeout=1800)
        finally:
            if cidfile.exists():
                container_id = cidfile.read_text().strip()
                if re.fullmatch(r"[a-f0-9]{64}", container_id):
                    subprocess.run(["docker", "rm", "-f", container_id],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   timeout=30)


def run_monthly(archive, state, today, restore):
    state.mkdir(mode=0o700, parents=True, exist_ok=True)
    month = today.strftime("%Y-%m")
    marker = state / "last-success"
    with (state / "lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if marker.is_file() and marker.read_text().strip() == month:
            return False
        restore(archive)
        pending = state / "last-success.tmp"
        pending.write_text(month + "\n")
        pending.replace(marker)
    return True


def main(arguments):
    if len(arguments) != 1:
        raise ValueError("expected one completed daily dump")
    archive = Path(arguments[0])
    if (not DRIVE.is_mount() or archive.parent.parent != ROOT or
            not re.fullmatch(r"daily-[0-9]{8}-[0-9]{6}", archive.parent.name) or
            archive.name != "db.dump" or archive.resolve(strict=True) != archive or
            not archive.is_file()):
        raise ValueError("invalid archive")
    if run_monthly(archive, STATE, datetime.date.today(), restore_archive):
        print("놀스토리 월간 복원 검사 통과", archive.parent.name)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        main(sys.argv[1:])
    except (ValueError, OSError, subprocess.SubprocessError):
        sys.exit("놀스토리 월간 복원 검사 실패. 백업 로그와 Toshiba 연결 상태를 확인하세요.")
