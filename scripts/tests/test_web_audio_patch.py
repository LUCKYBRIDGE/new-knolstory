"""The gapless-loop patch of Ren'Py's web audio applies only to the reviewed SDK file, each edit exactly once."""
import hashlib
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('web_audio', ROOT / 'spikes/renpy-web/web_audio.py')
web_audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(web_audio)
SDK_AUDIO = ROOT / '.cache/renpy/renpy-8.5.3-sdk/renpy/common/_audio.js'


class WebAudioPatchTest(unittest.TestCase):
    def test_rejects_other_sdk_source(self):
        with self.assertRaises(SystemExit):
            web_audio.patch_web_audio('renpyAudio = {};')

    def test_every_edit_has_a_distinct_anchor(self):
        anchors = [anchor for anchor, _ in web_audio.EDITS]
        self.assertEqual(len(anchors), len(set(anchors)))

    @unittest.skipUnless(SDK_AUDIO.is_file(), 'pinned Ren\'Py SDK not prepared (pnpm runtime:prepare)')
    def test_patches_the_pinned_sdk_file(self):
        source = SDK_AUDIO.read_bytes().decode('utf-8')
        self.assertEqual(hashlib.sha256(source.encode('utf-8')).hexdigest(), web_audio.SOURCE_SHA256)
        patched = web_audio.patch_web_audio(source)
        # Booking happens where a round starts and where a loop's next round is queued.
        self.assertEqual(patched.count('knol_schedule_queued(c);'), 3)
        # Every way Ren'Py ends, replaces, fades or pauses a channel cancels a booking first.
        self.assertEqual(patched.count('knol_unschedule_queued(c);'), 5)
        self.assertIn('p = c.queued;', patched)


if __name__ == '__main__':
    unittest.main()
