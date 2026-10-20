"""Exercise the native layout function without starting a second renderer."""
import copy
import re
import random
import textwrap
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2] / 'renpy/responsive-spike/game/script.rpy'

class DialogueGeometryTests(unittest.TestCase):
    def test_reference_body_budget_is_three_landscape_five_portrait(self):
        code = re.search(r'    def knol_text_page_budget\(.*?(?=    def knol_text_page_for_offset)', SOURCE.read_text(), re.S).group()
        context = {}
        exec(textwrap.dedent(code), context)
        for portrait, rows in [(False, 3), (True, 5)]:
            self.assertEqual(context['knol_text_page_budget']({'height': 150}, 1000, 32, portrait, line_height=40), rows * 40)

    def test_compact_panel_overlays_stage_and_grows_only_for_actual_text(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_change_text_page)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                rows = sum(max(1, (len(line) + 19) // 20) for line in text.split('\n'))
                return type('Render', (), {'width': width, 'height': rows * (style['size'] + style.get('line_spacing', 0))})()
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 1280}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code), context)
        for width, height, rows in [(1280, 720, 3), (720, 1280, 5)]:
            boxes = []
            for text in ['짧은 글', '긴 글입니다. ' * 100]:
                scene = {'width': width, 'height': height, 'dialogue': {'speaker': '토끼', 'text': text},
                         'actors': [{'rect': {'x': 12, 'y': 40, 'width': 300, 'height': 600}}]}
                before = copy.deepcopy(scene)
                metrics = context['knol_dialogue_metrics'](scene)
                boxes.append(context['knol_textbox'](scene))
                if text == '짧은 글':
                    self.assertEqual(metrics['bodyHeight'], 30)
                else:
                    self.assertGreater(metrics['bodyHeight'], 30)
                self.assertEqual(''.join(metrics['pages']), text)
                self.assertEqual(scene, before)
            self.assertLess(boxes[0]["height"], boxes[1]["height"])
            self.assertEqual(boxes[0]['x'], 0)
            self.assertEqual(boxes[0]['width'], width)
            self.assertEqual(boxes[0]['y'] + boxes[0]['height'], height)

    def test_speaker_length_is_stable_and_large_font_expands_without_repagination(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_change_text_page)', script, re.S).group()
        geometry = re.search(r'    def knol_dialogue_rects\(.*?(?=    def knol_choices_rect)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                columns = max(1, width // style['size'])
                rows = sum(max(1, (len(line) + columns - 1) // columns) for line in text.split('\n'))
                pitch = int(style['size'] * 1.4) + style.get('line_spacing', 0)
                return type('Render', (), {'width': width, 'height': rows * pitch})()
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 1280}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code + geometry), context)
        for width, height in [(1280, 720), (720, 1280)]:
            for size in [30, 64, 96]:
                panel_heights = []
                for speaker in ['토끼', '아주 긴 이름을 가진 말하는 사람 ' * 20]:
                    scene = {'width': width, 'height': height, 'dialogueStyle': {'fontSize': size, 'speakerFontSize': size},
                             'dialogue': {'speaker': speaker, 'text': '긴 글입니다. ' * 100}}
                    metrics = context['knol_dialogue_metrics'](scene)
                    box = context['knol_textbox'](scene)
                    rects = context['knol_measure_dialogue'](scene)
                    panel_heights.append(box['height'])
                    self.assertEqual(box['y'] + box['height'], height)
                    if size == 30:
                        self.assertGreaterEqual(box['y'], 0)
                    if size == 96:
                        self.assertGreater(box['height'], height)
                    self.assertGreaterEqual(metrics['bodyHeight'], context['knol_body_render']('가', width - 48, size).height)
                    body_bottom = rects['body']['y'] + rects['body']['height']
                    self.assertLessEqual(body_bottom + metrics['controlsHeight'] + metrics['toolsHeight'] + 8, height)
                    self.assertTrue(all(context['knol_body_render'](page, width - 48, size).height <= metrics['bodyHeight'] for page in metrics['pages']))
                self.assertEqual(panel_heights[0], panel_heights[1])

    def test_reader_font_changes_preserve_every_page_and_character_offset(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_change_text_page)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                columns = max(1, width // style['size'])
                rows = sum(max(1, (len(line) + columns - 1) // columns) for line in text.split('\n'))
                return type('Render', (), {'width': width, 'height': rows * (style['size'] + style.get('line_spacing', 0))})()
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 1280}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code), context)
        for width, height in [(1280, 720), (720, 1280)]:
            reference_pages = None
            for text in ['토끼는 바다를 바라보았다. 자라는 천천히 대답했다. ' * 20,
                         '첫 문단입니다.\n\n다음 문단은 길게 이어집니다. ' * 20]:
                for size in [16, 30, 42, 64]:
                    scene = {'width': width, 'height': height,
                             'dialogueStyle': {'fontSize': size, 'paginationFontSize': 32},
                             'dialogue': {'speaker': '토끼', 'text': text}}
                    metrics = context['knol_dialogue_metrics'](scene)
                    if size == 16:
                        reference_pages = metrics['pages']
                    self.assertEqual(metrics['pages'], reference_pages)
                    if size <= 42:
                        self.assertLessEqual(metrics['panelHeight'], height)
                    self.assertEqual(''.join(metrics['pages']), text)
                    offsets = [sum(map(len, reference_pages[:i])) for i in range(len(reference_pages))]
                    self.assertEqual([context['knol_text_page_for_offset'](metrics['pages'], offset) for offset in offsets], list(range(len(offsets))))
                    self.assertTrue(all(context['knol_body_render'](page, width - 48, size).height <= metrics['bodyHeight'] for page in metrics['pages']))

    def test_four_three_extension_covers_bottom_without_reframing_artwork(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_change_text_page)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                columns = max(1, width // style['size'])
                rows = sum(max(1, (len(line) + columns - 1) // columns) for line in text.split('\n'))
                return type('Render', (), {'width': width, 'height': rows * (style['size'] + style.get('line_spacing', 0))})()
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 960}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code), context)
        for size in [16, 32, 42]:
            scene = {'width': 1280, 'height': 960, 'artworkRect': {'x': 0, 'y': 0, 'width': 1280, 'height': 720},
                     'dialogueStyle': {'fontSize': size, 'paginationFontSize': 32, 'toolsHeight': 200},
                     'dialogue': {'speaker': '토끼', 'text': '짧은 글'}, 'actors': [{'rect': {'x': 35, 'y': 120, 'width': 250, 'height': 600}}]}
            before = copy.deepcopy(scene)
            box = context['knol_textbox'](scene)
            self.assertGreaterEqual(context['knol_dialogue_metrics'](scene)['toolsHeight'], 200)
            self.assertGreaterEqual(box['height'], 240)
            self.assertLessEqual(box['y'], 720)
            self.assertEqual(box['y'] + box['height'], 960)
            self.assertEqual(scene, before)
        self.assertIn('id "artwork-clip"', script)
        self.assertIn('id "artwork-effects-clip"', script)
        self.assertIn('xysize (int(artwork_rect["width"]), int(artwork_rect["height"]))', script)

    def test_background_fallback_uses_artwork_rect_not_extended_canvas(self):
        code = re.search(r'    def knol_background\(.*?(?=    from service_audio)', SOURCE.read_text(), re.S).group()
        context = {'Transform': lambda image, **style: style, 'knol_look': lambda scene: None,
                   'knol_target_shake': lambda **kwargs: None,
                   'config': type('Config', (), {'screen_width': 1280, 'screen_height': 960})}
        exec(textwrap.dedent(code), context)
        scene = {'width': 1280, 'height': 960, 'artworkRect': {'x': 0, 'y': 0, 'width': 1280, 'height': 720},
                 'background': {'imagePath': 'background.webp', 'fit': 'cover'}}
        transform = context['knol_background'](scene)
        self.assertEqual(transform['xysize'], (1280, 720))
        self.assertEqual((transform['xpos'], transform['ypos']), (0, 0))

    def test_label_measured_height_cannot_overlap_body(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_dialogue_rects\(.*?(?=    def knol_measure_dialogue)', script, re.S).group()
        context = {'knol_textbox': lambda scene: scene['textboxRect'], 'knol_dialogue_metrics': lambda scene: {'speakerHeight': 34, 'bodyHeight': 60}}
        exec(textwrap.dedent(code), context)
        for width, height, y in [(720, 192, 1238), (921, 192, 642), (1280, 174, 510)]:
            scene = {'textboxRect': {'x': 24, 'y': y, 'width': width, 'height': height}, 'dialogueStyle': {'padding': 24}}
            for label_height in [28, 44, 80, 300, 2000]:
                rects = context['knol_dialogue_rects'](scene, 1800, label_height)
                speaker, body = rects['speaker'], rects['body']
                self.assertEqual(speaker['y'] + speaker['height'], body['y'] - 8)
                self.assertGreaterEqual(speaker['y'], 0)
                self.assertLessEqual(speaker['x'] + speaker['width'], scene['textboxRect']['x'] + width)
                self.assertLessEqual(body['y'] + body['height'], y + height)

    def test_body_uses_direct_native_text_without_scroll_container(self):
        script = SOURCE.read_text()
        body = script.split('id "textbox"', 1)[1].split('        frame:', 1)[0]
        self.assertNotIn('viewport:', body)
        self.assertNotIn('knol_body_scroll', script)
        self.assertIn('text knol_literal(knol_dialogue_metrics(knol_scene)["pages"][knol_text_page])', body)

    def test_extreme_text_pages_preserve_newlines_and_all_characters(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_split_text_pages\(.*?(?=    def knol_dialogue_metrics)', script, re.S).group()
        context = {}
        exec(textwrap.dedent(code), context)
        def measure(text):
            return sum(max(1, (len(line) + 9) // 10) for line in text.split('\n')) * 30
        for text in ['', '두 줄\n본문입니다', '긴 본문과 공백 ' * 100, '가' * 1000, '\n' * 80]:
            pages = context['knol_split_text_pages'](text, 150, measure)
            self.assertEqual(''.join(pages), text)
            self.assertTrue(all(measure(page) <= 150 for page in pages))
            self.assertTrue(all(page for page in pages) or pages == [''])

    def test_sentence_word_and_grapheme_priority(self):
        code = re.search(r'    def knol_split_text_pages\(.*?(?=    def knol_dialogue_metrics)', SOURCE.read_text(), re.S).group()
        context = {}
        exec(textwrap.dedent(code), context)
        split = context['knol_split_text_pages']
        for text, capacity, first in [
            ('토끼가 왔다. 자라는 천천히 대답했다.', 15, '토끼가 왔다. '),
            ('“정말이야?” 토끼가 물었다. 자라는 고개를 끄덕였다.', 20, '“정말이야?” 토끼가 물었다. '),
            ('수치는 3.5이며 다음 값이다', 12, '수치는 3.5이며 '),
            ('https://example.com/long 다음 말', 22, 'https://example.com/lo'),
            ('긴 문장 안의 여러 단어가 계속 이어진다', 13, '긴 문장 안의 여러 '),
            ('abcdef.', 6, 'abcde'),
            ('첫 문단\n다음 문단은 길게 이어진다', 12, '첫 문단\n'),
        ]:
            self.assertEqual(split(text, capacity, len)[0], first)
        clusters = ['👨‍👩‍👧‍👦', 'e\u0301', '🇰🇷', '👍🏽', '가', '각']
        text = ''.join(clusters)
        pages = split(text, 7, lambda value: len(value))
        boundaries = {0}
        offset = 0
        for cluster in clusters:
            offset += len(cluster)
            boundaries.add(offset)
        offset = 0
        for page in pages:
            offset += len(page)
            self.assertIn(offset, boundaries)
        self.assertEqual(''.join(pages), text)

    def test_fixed_seed_random_pagination_preserves_text_and_fitting(self):
        code = re.search(r'    def knol_split_text_pages\(.*?(?=    def knol_dialogue_metrics)', SOURCE.read_text(), re.S).group()
        context = {}
        exec(textwrap.dedent(code), context)
        rng = random.Random(20261018)
        tokens = ['토끼는 ', '왔다. ', '“정말?” ', '3.5 ', 'https://a.b/c ', '\n', '👩‍💻', 'e\u0301', '🇰🇷', '긴말']
        for _ in range(1000):
            text = ''.join(rng.choice(tokens) for _ in range(rng.randint(1, 50)))
            capacity = rng.randint(15, 70)
            pages = context['knol_split_text_pages'](text, capacity, len)
            self.assertEqual(''.join(pages), text)
            self.assertTrue(all(page and len(page) <= capacity for page in pages))

    def test_budget_and_resize_keep_character_anchor(self):
        code = re.search(r'    def knol_split_text_pages\(.*?(?=    def knol_dialogue_metrics)', SOURCE.read_text(), re.S).group()
        context = {}
        exec(textwrap.dedent(code), context)
        budget = context['knol_text_page_budget']
        base = {'height': 174}
        self.assertEqual(budget(base, 800, 32, True, line_height=56, scene_height=1440), 280)
        self.assertEqual(budget(base, 800, 32, False, line_height=56), 168)
        self.assertEqual([budget(base, 600, 40, True, rows) for rows in (3, 4, 5)], [156, 208, 260])
        self.assertEqual(budget(base, 100, 40, True), 100)
        for height in [640, 844, 1440, 1800]:
            self.assertEqual(budget(base, 1600, 32, True, scene_height=height), 210)
        self.assertEqual(context['knol_text_page_for_offset'](['abc', 'defgh', 'ijk'], 3), 1)
        self.assertEqual(context['knol_text_page_for_offset'](['abcde', 'fghijk'], 3), 0)
        self.assertEqual(context['knol_text_page_for_offset']([''], 0), 0)
        script = SOURCE.read_text()
        self.assertIn('previous_offset = knol_text_offset', script)
        self.assertIn('knol_text_offset = previous_offset if same_text else requested_offset', script)
        self.assertIn('previous_text == knol_scene.get("dialogue", {}).get("text")', script)

    def test_page_change_anchors_survive_repeated_reflow(self):
        script = SOURCE.read_text()
        helpers = re.search(r'    def knol_split_text_pages\(.*?(?=    def knol_dialogue_metrics)', script, re.S).group()
        change = re.search(r'    def knol_change_text_page\(.*?(?=    def knol_text_input)', script, re.S).group()
        pages = ['abc', 'defgh', 'ijk']
        context = {'knol_text_page': 0, 'knol_text_offset': 0, 'knol_pending': False,
                   'knol_scene': {}, 'knol_dialogue_metrics': lambda scene: {'pages': pages},
                   'renpy': type('Native', (), {'restart_interaction': lambda self: None})()}
        exec(textwrap.dedent(helpers + change), context)
        context['knol_change_text_page'](1)
        self.assertEqual(context['knol_text_offset'], 3)
        for _ in range(10):
            pages = ['abcde', 'fghijk']
            context['knol_text_page'] = context['knol_text_page_for_offset'](pages, context['knol_text_offset'])
            self.assertEqual(context['knol_text_page'], 0)
            pages = ['abc', 'defgh', 'ijk']
            context['knol_text_page'] = context['knol_text_page_for_offset'](pages, context['knol_text_offset'])
            self.assertEqual(context['knol_text_page'], 1)
        context['knol_change_text_page'](1)
        self.assertEqual(context['knol_text_offset'], 8)
        self.assertTrue(context['knol_pending'])

    def test_metrics_use_native_font_wrap_spacing_and_bounded_last_scene_cache(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_textbox)', script, re.S).group()
        calls = []
        class Render:
            def __init__(self, width, height):
                self.width, self.height = width, height
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                calls.append((text, style, width, height))
                rows = sum(max(1, (len(line) + 19) // 20) for line in text.split('\n'))
                return Render(min(width, len(text) * 12), rows * (style['size'] + style.get('line_spacing', 0)))
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 720}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code), context)
        for text in ['짧은 본문', '문단\n' * 12, '가나다라마바사' * 500]:
            scene = {'dialogue': {'speaker': '말하는 이', 'text': text},
                     'textboxRect': {'x': 48, 'y': 510, 'width': 1184, 'height': 174}}
            before = copy.deepcopy(scene)
            metrics = context['knol_dialogue_metrics'](scene)
            count = len(calls)
            self.assertIs(context['knol_dialogue_metrics'](scene), metrics)
            self.assertEqual(len(calls), count)
            self.assertEqual(''.join(metrics['pages']), text)
            self.assertEqual(metrics['controlsHeight'], 24)
            self.assertLessEqual(metrics['panelHeight'], 720)
            self.assertEqual(scene, before)
        body_calls = [call for call in calls if 'line_spacing' in call[1]]
        self.assertTrue(body_calls)
        for _, style, width, height in body_calls:
            self.assertEqual(style['font'], 'NotoSansKR.ttf')
            self.assertIn(style['size'], (30, 32))
            self.assertEqual(style['line_spacing'], 0)
            self.assertEqual(width, 1232)
            self.assertGreater(height, 720)

    def test_page_controls_scale_with_body_font_and_reserve_space(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_body_render\(.*?(?=    def knol_textbox)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                rows = max(1, (len(text) + 19) // 20)
                return type('Render', (), {'width': width, 'height': rows * (style['size'] + style.get('line_spacing', 0))})()
        context = {'Text': lambda text, **style: (text, style), 'knol_literal': lambda value: value,
                   'renpy': Native(), 'config': type('Config', (), {'screen_height': 1440}), 'knol_dialogue_cache': None}
        exec(textwrap.dedent(code), context)
        for size, expected in [(16, 18), (30, 24), (44, 33), (64, 46)]:
            scene = {'width': 720, 'height': 1440, 'dialogueStyle': {'fontSize': size},
                     'dialogue': {'speaker': '토끼', 'text': '긴 글 입니다. ' * 100},
                     'textboxRect': {'x': 24, 'y': 1238, 'width': 672, 'height': 192}}
            metrics = context['knol_dialogue_metrics'](scene)
            self.assertEqual(metrics['controlsHeight'], expected)
            self.assertLessEqual(metrics['panelHeight'], 1440)
            self.assertGreater(len(metrics['pages']), 1)
            self.assertEqual(''.join(metrics['pages']), scene['dialogue']['text'])
        controls = script.split('textbutton "‹ 이전":', 1)[1].split('        frame:', 1)[0]
        self.assertIn('textbutton "계속 ›":', controls)
        self.assertIn('if knol_text_page > 0:', script)
        self.assertNotIn('str(knol_text_page + 1) + " / "', script)
        self.assertEqual(controls.count('text_size page_text_size'), 2)
        self.assertEqual(controls.count('hover_background None'), 2)
        self.assertIn('background Solid("#183331e8")', script)
        self.assertNotIn('background Frame("ui/dialogue-paper.svg"', script)

    def test_page_advance_keeps_native_audio_and_transition_input_guards(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_text_input\(.*?(?=    def knol_dialogue_rects)', script, re.S).group()
        calls = []
        context = {'knol_scene': {'mode': 'play'}, 'knol_ready': True, 'knol_text_page': 0, 'knol_transition_active': False,
                   'knol_waiting_for_audio': lambda: False, 'knol_dialogue_metrics': lambda scene: {'pages': ['first', 'last']},
                   'knol_change_text_page': lambda offset: calls.append(('page', offset)),
                   'knol_input': lambda kind, choice: calls.append((kind, choice))}
        exec(textwrap.dedent(code), context)
        context['knol_text_input']('advanceRequested')
        self.assertEqual(calls, [('page', 1)])
        context['knol_text_page'] = 1
        context['knol_text_input']('advanceRequested')
        self.assertEqual(calls[-1], ('advanceRequested', None))
        calls.clear()
        context['knol_transition_active'] = True
        context['knol_text_input']('advanceRequested')
        context['knol_transition_active'] = False
        context['knol_waiting_for_audio'] = lambda: True
        context['knol_text_input']('advanceRequested')
        self.assertEqual(calls, [])

    def test_body_input_and_keyboard_do_not_skip_final_choices(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_text_input\(.*?(?=    def knol_dialogue_rects)', script, re.S).group()
        calls = []
        context = {'knol_scene': {'mode': 'play', 'choices': [{'id': 'a'}]}, 'knol_ready': True,
                   'knol_text_page': 0, 'knol_transition_active': False, 'knol_waiting_for_audio': lambda: False,
                   'knol_dialogue_metrics': lambda scene: {'pages': ['first', 'last']},
                   'knol_change_text_page': lambda offset: calls.append(('page', offset)),
                   'knol_input': lambda kind, choice: calls.append((kind, choice))}
        exec(textwrap.dedent(code), context)
        context['knol_text_input']('advanceRequested')
        self.assertEqual(calls, [('page', 1)])
        calls.clear()
        context['knol_text_page'] = 1
        context['knol_text_input']('advanceRequested')
        self.assertEqual(calls, [])
        context['knol_text_input']('choiceSelected', 'a')
        self.assertEqual(calls, [('choiceSelected', 'a')])
        calls.clear()
        context['knol_ready'] = False
        context['knol_text_input']('choiceSelected', 'a')
        self.assertEqual(calls, [])
        body = script.split('id "textbox"', 1)[1].split('        frame:', 1)[0]
        self.assertIn('id "dialogue-input"', body)
        self.assertIn('ysize int(dialogue_rects["body"]["height"])', body)
        self.assertIn('action Function(knol_text_input, "advanceRequested")', body)
        for key in ['K_RETURN', 'K_SPACE']:
            self.assertIn('key "' + key + '" action Function(knol_text_input, "advanceRequested")', script)

    def test_final_page_advance_hit_area_stays_inside_reserved_nav_row(self):
        script = SOURCE.read_text()
        advance = script.split('if not knol_scene.get("choices") and not knol_scene.get("ended") and knol_text_page ==', 1)[1].split('            if knol_transition_active', 1)[0]
        self.assertNotIn('xysize (44, 44)', advance)
        self.assertIn('xsize 44', advance)
        self.assertIn('ysize knol_dialogue_metrics(knol_scene)["controlsHeight"]', advance)
        self.assertIn('padding (0, 0)', advance)

    def choice_layout_context(self):
        script = SOURCE.read_text()
        code = re.search(r'    def knol_choice_layout\(.*?(?=    def knol_resize)', script, re.S).group()
        class Native:
            def render(self, item, width, height, st, at):
                text, style = item
                # Conservative CJK width; native screenshots verify actual font metrics.
                columns = max(1, int(width / style['size']))
                rows = sum(max(1, (len(line) + columns - 1) // columns) for line in text.split('\n'))
                return type('Render', (), {'height': rows * (style['size'] + 4)})()
        context = {'knol_choice_cache': None, 'Text': lambda text, **style: (text, style),
                   'knol_literal': lambda value: value, 'renpy': Native()}
        exec(textwrap.dedent(code), context)
        return context

    def test_choice_popup_fits_two_to_four_options_without_scrolling(self):
        context = self.choice_layout_context()
        for width, height in [(1280, 720), (720, 1280)]:
            for count in (2, 3, 4):
                for text in ('다친 제비를 도와준다', '낯선 길이 두렵지만 친구와 함께 용기를 내어 숲속으로 들어간다. ' * 2):
                    scene = {'width': width, 'height': height,
                             'choices': [{'id': str(i), 'text': text} for i in range(count)]}
                    layout = context['knol_choice_layout'](scene)
                    self.assertFalse(layout['scroll'], (width, count, text))
                    self.assertGreaterEqual(layout['fontSize'], 24)
                    self.assertEqual(len(layout['buttonHeights']), count)
                    self.assertTrue(all(value >= 80 for value in layout['buttonHeights']))
                    rect = layout['rect']
                    self.assertAlmostEqual(rect['x'] + rect['width'] / 2, width / 2, delta=1)
                    self.assertAlmostEqual(rect['y'] + rect['height'] / 2, height / 2, delta=1)
                    self.assertLessEqual(rect['y'] + rect['height'], height - 24)

    def test_extreme_choice_text_preserves_access_in_a_bounded_popup(self):
        context = self.choice_layout_context()
        scene = {'width': 1280, 'height': 720, 'choices': [{'id': str(i), 'text': '긴 선택 문구 ' * 1000} for i in range(4)]}
        layout = context['knol_choice_layout'](scene)
        self.assertTrue(layout['scroll'])
        self.assertEqual(layout['fontSize'], 24)
        self.assertLessEqual(layout['rect']['height'], 720 - 48)
        self.assertIs(layout, context['knol_choice_layout'](scene))

    def test_popup_geometry_does_not_depend_on_dialogue_panel_height(self):
        context = self.choice_layout_context()
        scene = {'width': 1280, 'height': 720, 'choices': [{'id': 'a', 'text': '숲으로 간다'}]}
        first = context['knol_choices_rect'](scene, {'speaker': {'y': 390}})
        second = context['knol_choices_rect'](scene, {'speaker': {'y': 600}})
        self.assertEqual(first, second)
        self.assertGreater(first['y'], 0)
        self.assertLess(first['height'], 400)

    def test_popup_waits_for_final_page_audio_and_transition_before_taking_focus(self):
        code = re.search(r'    def knol_choices_visible\(.*?(?=    def knol_choice_layout)', SOURCE.read_text(), re.S).group()
        context = {'knol_ready': True, 'knol_scene': {'mode': 'play', 'choices': [{'id': 'a'}]},
                   'knol_transition_active': False, 'knol_waiting_for_audio': lambda: False,
                   'knol_text_page': 1, 'knol_dialogue_metrics': lambda scene: {'pages': ['first', 'last']}}
        exec(textwrap.dedent(code), context)
        self.assertTrue(context['knol_choices_visible']())
        for field, blocked in [('knol_ready', False), ('knol_text_page', 0), ('knol_transition_active', True)]:
            before = context[field]
            context[field] = blocked
            self.assertFalse(context['knol_choices_visible']())
            context[field] = before
        context['knol_waiting_for_audio'] = lambda: True
        self.assertFalse(context['knol_choices_visible']())
        context['knol_waiting_for_audio'] = lambda: False
        for patch in ({'mode': 'edit'}, {'ended': True}, {'choices': []}):
            before = context['knol_scene']
            context['knol_scene'] = {**before, **patch}
            self.assertFalse(context['knol_choices_visible']())
            context['knol_scene'] = before
