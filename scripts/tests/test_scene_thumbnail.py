"""Execute the actual offscreen adapter and prove it restores active native state."""
import pathlib
import textwrap
import types
import unittest


class NativeThumbnailTests(unittest.TestCase):
    def run_thumbnail(self, fail=False, mode="edit", dimensions=(1280, 720)):
        source = (pathlib.Path(__file__).resolve().parents[2] / "renpy/responsive-spike/game/script.rpy").read_text()
        source = source[source.index("    def knol_render_thumbnail("):source.index("    def knol_poll():")]
        emitted = []
        calls = []
        active = {"mode": mode, "sceneId": "active", "revision": 17}
        original = {"knol_scene": active, "knol_text_page": 2, "knol_text_offset": 45,
                    "knol_dialogue_cache": (active, {}), "knol_speaker_scroll": object()}
        ns = {**original, "knol_emit": emitted.append, "config": types.SimpleNamespace(screen_width=dimensions[0], screen_height=dimensions[1])}
        import base64
        ns["base64"] = base64
        def render(screen, width, height, st, at):
            self.assertEqual((width, height, st, at), (1280, 720, 0, 0))
            calls.append("logical-render")
            self.assertEqual(ns["knol_scene"]["sceneId"], "neighbor")
            self.assertEqual(ns["knol_text_page"], 0)
            if fail == "render":
                raise RuntimeError("GPU unavailable")
            return "logical-render"
        def shrink(rendered, *geometry):
            self.assertEqual(rendered, "logical-render")
            self.assertEqual(geometry, (0, 0, 1280, 720, 320, 180, True))
            calls.append("small-render")
            if fail == "scale":
                raise RuntimeError("Scale unavailable")
            return "small-render"
        def capture(rendered, **options):
            self.assertEqual(rendered, "small-render")
            self.assertEqual(options, {"resize": True})
            calls.append("small-readback")
            if fail == "capture":
                raise RuntimeError("Readback unavailable")
            return "surface"
        def encode(surface, output, quality):
            calls.append("png")
            if fail == "png":
                raise RuntimeError("PNG unavailable")
            output.write(b"png")
        ns["renpy"] = types.SimpleNamespace(
            ui=types.SimpleNamespace(adjustment=lambda: object()), log=lambda message: None,
            render=render, render_to_surface=capture,
            display=types.SimpleNamespace(
                screen=types.SimpleNamespace(ScreenDisplayable=lambda *args: object(), get_screen_variant=lambda name: name),
                motion=types.SimpleNamespace(zoom_render=shrink),
                module=types.SimpleNamespace(save_png=encode)))
        exec(textwrap.dedent(source), ns)
        ns["knol_render_thumbnail"]({"requestId": "test", "payload": {"sceneId": "neighbor", "revision": 0, "mode": "edit"}})
        for key, value in original.items():
            self.assertIs(ns[key], value)
        self.assertEqual(len(emitted), 1)
        self.assertEqual((emitted[0]["requestId"], emitted[0]["sceneId"], emitted[0]["revision"]), ("test", "neighbor", 0))
        sequence = ["logical-render", "small-render", "small-readback", "png"]
        if mode != "edit" or dimensions != (1280, 720):
            self.assertEqual(calls, [])
        elif fail:
            end = {"render": 1, "scale": 2, "capture": 3, "png": 4}[fail]
            self.assertEqual(calls, sequence[:end])
        else:
            self.assertEqual(calls, sequence)
        return emitted[0]

    def test_native_success_restores_current_scene_page_scroll_and_cache(self):
        result = self.run_thumbnail()
        self.assertEqual(result["type"], "sceneThumbnail")
        self.assertEqual((result["width"], result["height"]), (320, 180))

    def test_failed_render_and_playback_leave_active_state_untouched(self):
        for stage in ["render", "scale", "capture", "png"]:
            with self.subTest(stage=stage):
                self.assertEqual(self.run_thumbnail(fail=stage)["type"], "sceneThumbnailFailed")
        self.assertEqual(self.run_thumbnail(mode="play")["type"], "sceneThumbnailFailed")

    def test_incompatible_stage_is_not_rendered(self):
        self.assertEqual(self.run_thumbnail(dimensions=(720, 1280))["type"], "sceneThumbnailFailed")
