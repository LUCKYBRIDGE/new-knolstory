import datetime
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

from monthly_restore import run_monthly


class MonthlyRestoreTest(unittest.TestCase):
    def test_retries_failures_and_checks_again_next_month(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "daily-20260101-040000" / "db.dump"
            archive.parent.mkdir()
            archive.write_bytes(b"sample")
            state = root / "state"
            restore = Mock(side_effect=[RuntimeError("failed"), None, None])
            january = datetime.date(2026, 1, 1)
            with self.assertRaises(RuntimeError):
                run_monthly(archive, state, january, restore)
            self.assertTrue(run_monthly(archive, state, january, restore))
            self.assertFalse(run_monthly(archive, state, january, restore))
            self.assertTrue(run_monthly(archive, state, datetime.date(2026, 2, 1), restore))
            self.assertEqual(restore.call_count, 3)
