"""Execute the actual offscreen adapter and prove it restores active native state."""
import pathlib
import textwrap
import types
import unittest


class NativeThumbnailTests(unittest.TestCase):
    def run_thumbnail(self, fail=False, mode="edit"):
        source = (pathlib.Path(__file__).resolve().parents[2] / "renpy/responsive-spike/game/script.rpy").read_text()
        source = source[source.index("    def knol_render_thumbnail("):source.index("    def knol_poll():")]
        emitted = []
        active = {"mode": mode, "sceneId": "active", "revision": 17}
        original = {"knol_scene": active, "knol_text_page": 2, "knol_text_offset": 45,
                    "knol_dialogue_cache": (active, {}), "knol_speaker_scroll": object()}
        ns = {**original, "knol_emit": emitted.append, "config": types.SimpleNamespace(screen_width=1280, screen_height=720)}
        import base64
        ns["base64"] = base64
        def render(*args, **kwargs):
            self.assertEqual(ns["knol_scene"]["sceneId"], "neighbor")
            self.assertEqual(ns["knol_text_page"], 0)
            if fail:
                raise RuntimeError("GPU unavailable")
            return "surface"
        ns["renpy"] = types.SimpleNamespace(
            ui=types.SimpleNamespace(adjustment=lambda: object()), log=lambda message: None,
            render_to_surface=render,
            display=types.SimpleNamespace(
                screen=types.SimpleNamespace(ScreenDisplayable=lambda *args: object(), get_screen_variant=lambda name: name),
                scale=types.SimpleNamespace(smoothscale=lambda surface, size: surface),
                module=types.SimpleNamespace(save_png=lambda surface, output, quality: output.write(b"png"))))
        exec(textwrap.dedent(source), ns)
        ns["knol_render_thumbnail"]({"requestId": "test", "payload": {"sceneId": "neighbor", "revision": 0, "mode": "edit"}})
        for key, value in original.items():
            self.assertIs(ns[key], value)
        return emitted[0]

    def test_native_success_restores_current_scene_page_scroll_and_cache(self):
        result = self.run_thumbnail()
        self.assertEqual(result["type"], "sceneThumbnail")
        self.assertEqual((result["width"], result["height"]), (320, 180))

    def test_failed_render_and_playback_leave_active_state_untouched(self):
        self.assertEqual(self.run_thumbnail(fail=True)["type"], "sceneThumbnailFailed")
        self.assertEqual(self.run_thumbnail(mode="play")["type"], "sceneThumbnailFailed")
