define config.screen_width = 1280
define config.screen_height = 720
define config.name = "KnolStory Responsive Spike"
define config.version = "0.1"
define config.save_directory = None
define config.rollback_enabled = False
define config.allow_skipping = False
define config.window = "hide"

define build.name = "knolstory-spike"


init python:
    config.keymap = dict(config.keymap, game_menu=[], rollback=[], skip=[], toggle_skip=[])
    import json
    import time
    import os
    import base64
    import hashlib
    import re
    knol_scene = None
    knol_seq = -1
    knol_revision = -1
    knol_pending = False
    knol_started = 0
    knol_presentation_started = 0
    knol_last_viewport = None
    knol_ready = False
    knol_audio_unlocked = False
    knol_reported_audio = None
    knol_transition_active = False
    knol_dialogue_cache = None
    knol_text_page = 0
    knol_text_offset = 0
    knol_speaker_scroll = renpy.ui.adjustment()
    knol_choice_scroll = renpy.ui.adjustment()
    knol_choice_cache = None

    def knol_viewport():
        # Pinned SDK internal API: actual engine virtual-to-physical transform.
        width, height = renpy.display.draw.get_physical_size()
        left, top = renpy.display.draw.untranslate_point(0, 0)
        right, bottom = renpy.display.draw.untranslate_point(config.screen_width, config.screen_height)
        return {"x": left, "y": top, "width": right - left, "height": bottom - top,
            "physicalWidth": width, "physicalHeight": height}

    def knol_emit(event):
        if renpy.emscripten:
            rendered_event = dict(event, engineViewport=knol_viewport())
            renpy.emscripten.run_script("window.knolBridge.emit(" + json.dumps(rendered_event) + ")")

    def knol_waiting_for_audio(scene=None):
        value = scene if scene is not None else knol_scene
        audio = value.get("audio", {}) if value else {}
        return bool(value and value.get("mode") == "play" and not knol_audio_unlocked and
            (audio.get("music", {}).get("action") in ("play", "sequence") or audio.get("ambience", {}).get("action") in ("play", "sequence") or audio.get("sounds")))

    def knol_unlock_audio():
        global knol_audio_unlocked, knol_presentation_started, knol_audio_started, knol_pending
        if knol_audio_unlocked:
            return
        knol_audio_unlocked = True
        if knol_scene and knol_scene.get("mode") == "play":
            knol_presentation_started = time.monotonic()
            knol_apply_audio(knol_scene, True, knol_presentation_started)
            knol_start_native_transition(knol_scene)
            knol_audio_started = knol_presentation_started
            knol_sync_effect_clocks(knol_scene, True)
            knol_pending = True
        renpy.restart_interaction()

    def knol_body_render(text, width, size):
        displayable = Text(knol_literal(text), substitute=False, size=size,
            font="NotoSansKR.ttf", xmaximum=width, line_spacing=0)
        # Measure intrinsic text height, independently of the stage's clipping height.
        return renpy.render(displayable, width, max(16384, (len(text) + 1) * size * 2), 0, 0)

    def knol_split_text_pages(text, maximum_height, measure):
        import unicodedata
        # Keep extended clusters intact, including emoji families, flags and Jamo.
        def hangul(character):
            value = ord(character)
            if 0x1100 <= value <= 0x115f or 0xa960 <= value <= 0xa97c:
                return "L"
            if 0x1160 <= value <= 0x11a7 or 0xd7b0 <= value <= 0xd7c6:
                return "V"
            if 0x11a8 <= value <= 0x11ff or 0xd7cb <= value <= 0xd7fb:
                return "T"
            if 0xac00 <= value <= 0xd7a3:
                return "LV" if (value - 0xac00) % 28 == 0 else "LVT"
            return ""
        ends, regional_run = [], 0
        for index, character in enumerate(text):
            previous = text[index - 1] if index else ""
            value = ord(character)
            regional = 0x1f1e6 <= value <= 0x1f1ff
            current_hangul, previous_hangul = hangul(character), hangul(previous) if previous else ""
            attached = (unicodedata.category(character) in ("Mn", "Mc", "Me") or
                character == "\u200d" or previous == "\u200d" or
                0x1f3fb <= value <= 0x1f3ff or 0xe0020 <= value <= 0xe007f or
                (previous == "\r" and character == "\n") or
                (regional and regional_run % 2 == 1) or
                (previous_hangul == "L" and current_hangul in ("L", "V", "LV", "LVT")) or
                (previous_hangul in ("LV", "V") and current_hangul in ("V", "T")) or
                (previous_hangul in ("LVT", "T") and current_hangul == "T"))
            if index and not attached:
                ends.append(index)
            regional_run = regional_run + 1 if regional else 0
        ends.append(len(text))
        closers = '\"\'”’」』）》】)]}'
        terminals = '.!?。！？…'
        sentences, words = [], []
        for end in ends:
            prefix = text[:end]
            if prefix and prefix[-1].isspace():
                words.append(end)
            trimmed = prefix.rstrip()
            if not trimmed:
                continue
            core = trimmed.rstrip(closers)
            next_character = text[end:end + 1]
            # Dots within decimal numbers, URLs and abbreviations are not stops.
            terminal = core and core[-1] in terminals
            if terminal and (not next_character or next_character.isspace()):
                sentences.append(end)
            elif prefix[-1:] == "\n":
                sentences.append(end)
        pages, start = [], 0
        while start < len(text):
            if measure(text[start:]) <= maximum_height:
                pages.append(text[start:])
                break
            candidates = [end for end in ends if end > start]
            low, high = 0, len(candidates) - 1
            while low < high:
                middle = (low + high + 1) // 2
                if measure(text[start:candidates[middle]]) <= maximum_height:
                    low = middle
                else:
                    high = middle - 1
            limit = candidates[low]
            fitting_sentences = [end for end in sentences if start < end <= limit and text[start:end].strip()]
            fitting_words = [end for end in words if start < end <= limit and text[start:end].strip()]
            end = (fitting_sentences or fitting_words or [limit])[-1]
            # Carry trailing spaces with their text when they still fit.
            while end < limit and text[end].isspace() and end + 1 in ends:
                end += 1
            if end < len(text) and text[end] in terminals + closers:
                earlier = [boundary for boundary in ends if start < boundary < end]
                if earlier and text[start:earlier[-1]].strip():
                    end = earlier[-1]
            pages.append(text[start:end])
            start = end
        return pages or [""]

    def knol_text_page_budget(base, safe_height, font_size, portrait=False, lines=None, line_height=None, scene_height=None):
        rows = lines if lines is not None else (5 if portrait else 3)
        pitch = line_height if line_height is not None else font_size + int(font_size * .32)
        return max(1, min(safe_height, int(rows * pitch)))

    def knol_text_page_for_offset(pages, offset):
        consumed = 0
        for index, page in enumerate(pages):
            consumed += len(page)
            if offset < consumed:
                return index
        return max(0, len(pages) - 1)

    def knol_dialogue_metrics(scene):
        global knol_dialogue_cache
        if knol_dialogue_cache is not None and knol_dialogue_cache[0] is scene:
            return knol_dialogue_cache[1]
        style = scene.get("dialogueStyle", {})
        size, speaker_size, padding = int(style.get("fontSize", 30)), int(style.get("speakerFontSize", 28)), int(style.get("padding", 24))
        from math import ceil
        scene_width, scene_height = int(scene.get("width", 1280)), int(scene.get("height", 720))
        portrait = scene_width < scene_height
        label_width = max(1, scene_width - padding * 2)
        label = Text(knol_literal(scene["dialogue"]["speaker"]), substitute=False,
            size=speaker_size, font="NotoSansKR.ttf", xmaximum=label_width)
        label_render = renpy.render(label, label_width, scene_height, 0, 0)
        speaker_reference = Text("가", substitute=False, size=speaker_size, font="NotoSansKR.ttf", xmaximum=label_width)
        speaker_height = max(1, int(renpy.render(speaker_reference, label_width, scene_height, 0, 0).height) + 6)
        width = max(1, scene_width - padding * 2)
        measure = lambda text: knol_body_render(text, width, size).height
        rows = 5 if portrait else 3
        controls_height = max(18, int(ceil(size * .65)) + 4)
        tools_height = max(44, int(style.get("toolsHeight", 44)))
        # Pagination is an authored reading unit: accessibility font changes must
        # never move words to another page or change page count. Only the fixed
        # reference font determines boundaries; current size determines geometry.
        pagination_size = int(style.get("paginationFontSize", 32))
        reference_measure = lambda text: knol_body_render(text, width, pagination_size).height
        reference_budget = reference_measure("\n".join(["가"] * rows))
        text = scene["dialogue"]["text"]
        pages = knol_split_text_pages(text, reference_budget, reference_measure)
        # Reserve all actual pages at this font, so changing pages does not make
        # the panel jump. Large fonts expand the overlay, never the scene layout.
        body_height = max(measure("가"), max(measure(page) for page in pages))
        overhead = 12 + speaker_height + 8 + controls_height + tools_height + 8
        metrics = {"labelWidth": label_render.width, "labelHeight": label_render.height,
            "speakerHeight": speaker_height, "pages": pages, "bodyHeight": body_height,
            "controlsHeight": controls_height, "toolsHeight": tools_height,
            "panelHeight": max(overhead + body_height, scene_height - int(scene.get("artworkRect", {}).get("y", 0)) - int(scene.get("artworkRect", {}).get("height", scene_height)))}
        knol_dialogue_cache = (scene, metrics)
        return metrics

    def knol_textbox(scene):
        metrics = knol_dialogue_metrics(scene)
        width, height = int(scene.get("width", 1280)), int(scene.get("height", 720))
        return {"x": 0, "y": height - metrics["panelHeight"], "width": width, "height": metrics["panelHeight"]}

    def knol_dialogue_page_evidence(scene):
        if scene.get("transitionOnly"):
            return {"index": 0, "count": 1, "offset": 0, "endOffset": 0}
        pages = knol_dialogue_metrics(scene)["pages"]
        return {"index": knol_text_page, "count": len(pages), "offset": knol_text_offset,
            "endOffset": sum(len(page) for page in pages[:knol_text_page + 1])}

    def knol_change_text_page(offset):
        global knol_text_page, knol_text_offset, knol_pending
        pages = knol_dialogue_metrics(knol_scene)["pages"]
        knol_text_page = max(0, min(len(pages) - 1, knol_text_page + offset))
        knol_text_offset = sum(len(page) for page in pages[:knol_text_page])
        knol_pending = True
        renpy.restart_interaction()

    def knol_effect_step_pending():
        steps = knol_scene.get("effectSteps") if knol_scene else None
        return bool(steps and steps.get("current", 0) < steps.get("total", 0))

    def knol_manual_title():
        return bool(knol_scene and knol_scene.get("transitionOnly") and knol_scene.get("effectSteps") is not None)

    def knol_title_shake(trans, st, at):
        result = knol_target_shake(trans, st, at, "screen")
        screen_x, screen_y = trans.xoffset, trans.yoffset
        knol_target_shake(trans, st, at, "background")
        trans.xoffset += screen_x
        trans.yoffset += screen_y
        return result

    def knol_text_input(kind, choice_id=None):
        if not knol_ready or not knol_scene or knol_scene.get("mode") != "play" or knol_scene.get("ended") or knol_transition_active or (knol_scene.get("transitionOnly") and not knol_manual_title()) or knol_waiting_for_audio():
            return
        if not knol_scene.get("transitionOnly") and knol_text_page < len(knol_dialogue_metrics(knol_scene)["pages"]) - 1:
            knol_change_text_page(1)
        elif knol_effect_step_pending():
            # Each input activates one host-owned step; it cannot also choose or
            # leave the cut. Native text pagination always keeps first priority.
            knol_input("advanceRequested")
        elif not knol_scene.get("choices") or (kind == "choiceSelected" and choice_id is not None):
            knol_input(kind, choice_id)

    def knol_stage_tap():
        if not knol_ready or not knol_scene or knol_scene.get("mode") != "play" or knol_transition_active or (knol_scene.get("transitionOnly") and not knol_manual_title()) or knol_waiting_for_audio():
            return
        # Explicit choices own forward input; halves mode may still go back.
        left = renpy.get_mouse_pos()[0] < knol_scene["width"] / 2.0
        if knol_scene.get("readerTapMode", "next") == "halves" and left:
            if knol_text_page > 0 and not knol_scene.get("ended") and not knol_scene.get("transitionOnly"):
                knol_change_text_page(-1)
            elif knol_scene.get("readerCanGoBack", False):
                knol_input("backRequested")
        elif not knol_scene.get("ended") and not knol_choices_visible():
            knol_text_input("advanceRequested")

    def knol_dialogue_rects(scene, label_width, label_height):
        box = knol_textbox(scene)
        padding = int(scene.get("dialogueStyle", {}).get("padding", 24))
        metrics = knol_dialogue_metrics(scene)
        speaker = {"x": padding, "y": box["y"] + 12,
            "width": max(1, box["width"] - padding * 2), "height": metrics["speakerHeight"]}
        body = {"x": padding, "y": speaker["y"] + speaker["height"] + 8,
            "width": max(1, box["width"] - padding * 2), "height": metrics["bodyHeight"]}
        return {"speaker": speaker, "body": body}

    def knol_measure_dialogue(scene):
        metrics = knol_dialogue_metrics(scene)
        return knol_dialogue_rects(scene, metrics["labelWidth"], metrics["labelHeight"])

    def knol_choices_visible():
        return bool(knol_ready and knol_scene and knol_scene.get("choices") and
            knol_scene.get("mode") == "play" and not knol_scene.get("ended") and
            not knol_transition_active and not knol_waiting_for_audio() and not knol_effect_step_pending() and
            knol_text_page == len(knol_dialogue_metrics(knol_scene)["pages"]) - 1)

    def knol_choice_layout(scene):
        global knol_choice_cache
        if knol_choice_cache is not None and knol_choice_cache[0] is scene:
            return knol_choice_cache[1]
        width, height = int(scene["width"]), int(scene["height"])
        portrait = height > width
        padding, gap, header = 24, 12, 92
        maximum_height = height - 64
        maximum_width = width - 64
        preferred_width = min(maximum_width, 640 if portrait else 880)
        choices = scene.get("choices", [])
        # Measure the very same literal text/font used by the native buttons.
        # Widen before reducing type; never truncate authored choices to make them fit.
        for font_size in range(34 if portrait else 32, 23, -2):
            for popup_width in (preferred_width, maximum_width):
                text_width = popup_width - padding * 2 - 48 - 12
                heights = [max(96, renpy.render(Text(knol_literal(choice["text"]),
                    substitute=False, font="NotoSansKR.ttf", size=font_size,
                    line_spacing=4), text_width, 2000000, 0, 0).height + 32)
                    for choice in choices]
                content_height = sum(heights) + gap * max(0, len(heights) - 1)
                popup_height = content_height + header + padding * 2
                if popup_height <= maximum_height:
                    break
            if popup_height <= maximum_height:
                break
        popup_height = min(maximum_height, popup_height)
        layout = {"rect": {"x": (width - popup_width) // 2, "y": (height - popup_height) // 2,
            "width": popup_width, "height": popup_height}, "padding": padding,
            "gap": gap, "headerHeight": header, "fontSize": font_size,
            "buttonHeights": heights, "listHeight": popup_height - header - padding * 2,
            "scroll": content_height > popup_height - header - padding * 2}
        knol_choice_cache = (scene, layout)
        return layout

    def knol_choices_rect(scene, dialogue_rects):
        return knol_choice_layout(scene)["rect"]

    def knol_resize(scene):
        width, height = int(scene["width"]), int(scene["height"])
        if (width, height) != (config.screen_width, config.screen_height):
            config.screen_width, config.screen_height = width, height
            # Pinned SDK renderer API; changes virtual dimensions in this instance.
            renpy.game.interface.set_mode()
            renpy.free_memory()

    def knol_background(scene):
        from functools import partial
        background = scene["background"]
        rect = background.get("rect")
        if rect:
            return Transform(background["imagePath"], xysize=(int(rect["width"]), int(rect["height"])),
                xpos=int(rect["x"]), ypos=int(rect["y"]), matrixcolor=knol_look(scene), function=partial(knol_target_shake, kind="background"))
        artwork = scene.get("artworkRect", {"x": 0, "y": 0, "width": scene.get("width", config.screen_width), "height": scene.get("height", config.screen_height)})
        return Transform(background["imagePath"], xysize=(int(artwork["width"]), int(artwork["height"])),
            xpos=int(artwork["x"]), ypos=int(artwork["y"]), xanchor=0, yanchor=0,
            fit=background.get("fit", "cover"), matrixcolor=knol_look(scene), function=partial(knol_target_shake, kind="background"))

    from service_audio import ServiceAudioCache
    knol_service_audio_cache = ServiceAudioCache(config.gamedir)

    def knol_install_service_audio(resources, scene):
        audio = scene.get("audio") or {}
        paths = [cue["audioPath"] for cue in [audio.get("music", {}), audio.get("ambience", {})] if cue.get("action") == "play"] + [cue["audioPath"] for cue in audio.get("sounds", [])]
        paths += [clip["audioPath"] for channel in ("music", "ambience") for clip in audio.get(channel, {}).get("clips", [])]
        paths = [path for path in paths if path.startswith("assets/audio/cc0/") and "/v" in path]
        protected = [knol_audio_source_path(renpy.music.get_playing(channel=channel)) for channel in ["music", "knol_ambience"] + ["knol_sound_" + str(index) for index in range(8)]]
        protected += [cue["audioPath"] for cue in knol_audio_pending]
        for state in (knol_music_sequence, knol_ambience_sequence):
            if state and not state["finished"]:
                protected += [clip["audioPath"] for clip in state["clips"]]
        knol_service_audio_cache.install(resources, paths, [path for path in protected if path])

    def knol_install_audio(resources):
        for resource in resources:
            match = re.fullmatch(r"audio:custom:([a-f0-9]{64}):(wav|ogg|mp3)", resource["id"])
            if not match:
                raise ValueError("오디오 자산 ID가 올바르지 않습니다.")
            data = base64.b64decode(resource["data"], validate=True)
            if len(data) > 8 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != match.group(1):
                raise ValueError("오디오 자산 데이터가 올바르지 않습니다.")
            directory = os.path.join(config.gamedir, "assets", "audio")
            os.makedirs(directory, exist_ok=True)
            destination = os.path.join(directory, match.group(1) + "." + match.group(2))
            if not os.path.exists(destination):
                with open(destination, "wb") as output:
                    output.write(data)

    def knol_render_thumbnail(command):
        # Pinned 8.5.3 screen adapter: render the existing native screen offscreen.
        # No show_screen/loadScene, audio calls, revision changes or interaction.
        global knol_scene, knol_text_page, knol_text_offset, knol_dialogue_cache, knol_speaker_scroll
        original = (knol_scene, knol_text_page, knol_text_offset, knol_dialogue_cache, knol_speaker_scroll)
        target = command["payload"]
        result = {"protocol": 1, "type": "sceneThumbnailFailed", "requestId": command["requestId"],
            "sceneId": target["sceneId"], "revision": target["revision"]}
        try:
            if not knol_scene or knol_scene.get("mode") != "edit" or (config.screen_width, config.screen_height) != (1280, 720):
                return
            import io
            knol_scene, knol_text_page, knol_text_offset = target, 0, 0
            knol_dialogue_cache, knol_speaker_scroll = None, renpy.ui.adjustment()
            screen = renpy.display.screen.ScreenDisplayable(
                renpy.display.screen.get_screen_variant("knol_stage"), None, None)
            # Keep the authored stage geometry, but scale the native Render before
            # GPU readback so a thumbnail does not allocate a full-size CPU surface.
            rendered = renpy.render(screen, 1280, 720, 0, 0)
            thumbnail = renpy.display.motion.zoom_render(rendered, 0, 0, 1280, 720, 320, 180, True)
            surface = renpy.render_to_surface(thumbnail, resize=True)
            output = io.BytesIO()
            renpy.display.module.save_png(surface, output, 0)
            result.update(type="sceneThumbnail", width=320, height=180,
                dataUrl="data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii"))
        except Exception as error:
            renpy.log("KnolStory thumbnail: " + str(error))
        finally:
            knol_scene, knol_text_page, knol_text_offset, knol_dialogue_cache, knol_speaker_scroll = original
            knol_emit(result)

    def knol_poll():
        global knol_scene, knol_seq, knol_revision, knol_pending, knol_started, knol_last_viewport, knol_ready, knol_transition_active, knol_presentation_started, knol_reported_audio, knol_text_page, knol_text_offset
        if not renpy.emscripten:
            return
        if not knol_ready:
            knol_emit({"protocol": 1, "type": "ready", "runtimeVersion": "8.5.3", "contractVersion": 1})
            knol_ready = True
        viewport = knol_viewport()
        if viewport != knol_last_viewport:
            knol_last_viewport = viewport
            knol_emit({"protocol": 1, "type": "viewportChanged"})
        if not knol_waiting_for_audio():
            knol_poll_audio(knol_transition_active)
        audio_state = knol_audio_state()
        audio_signature = (audio_state["musicPath"], audio_state["musicStartCount"],
            audio_state.get("ambiencePath"), audio_state.get("ambienceStartCount"),
            audio_state["soundPlayCount"], tuple(audio_state["soundPaths"]))
        if knol_scene and (knol_pending or audio_signature != knol_reported_audio):
            box = renpy.get_widget("knol_stage", "textbox")
            if box:
                rendered = renpy.render(box, config.screen_width, config.screen_height, 0, 0)
                textbox = knol_textbox(knol_scene)
                knol_emit({"protocol": 1, "type": "sceneRendered", "revision": knol_revision,
                    "sceneId": knol_scene["sceneId"], "engineLogicalSize": {"width": config.screen_width, "height": config.screen_height}, "audioState": knol_audio_state(), "textboxRect": {"x": textbox["x"], "y": textbox["y"],
                    "width": rendered.width, "height": rendered.height},
                    "dialoguePage": knol_dialogue_page_evidence(knol_scene),
                    "dialogueRects": knol_measure_dialogue(knol_scene),
                    **({"choicesRect": knol_choices_rect(knol_scene, knol_measure_dialogue(knol_scene))} if knol_scene.get("choices") else {}),
                    "renderMs": (time.monotonic() - knol_started) * 1000})
                knol_reported_audio = audio_signature
                knol_pending = False
        raw = renpy.emscripten.run_script_string("window.knolBridge.drain()")
        messages = json.loads(raw)
        for command in messages:
            if command.get("type") == "renderSceneThumbnail":
                knol_render_thumbnail(command)
                continue
            if command.get("type") == "nextDialoguePage":
                if knol_scene and command.get("sceneId") == knol_scene["sceneId"] and command.get("revision") == knol_revision:
                    # Host auto may only turn native text pages; a raced manual input must never skip a cut.
                    if knol_scene.get("mode") == "play" and not knol_scene.get("ended") and not knol_transition_active and not knol_waiting_for_audio() and knol_text_page < len(knol_dialogue_metrics(knol_scene)["pages"]) - 1:
                        knol_change_text_page(1)
                continue
            if command["seq"] <= knol_seq or command["revision"] <= knol_revision:
                continue
            try:
                knol_install_audio(command.get("audioResources", []))
                knol_install_service_audio(command.get("serviceAudioResources", []), command["payload"])
            except (ValueError, KeyError, OSError) as error:
                renpy.log("KnolStory audio resource: " + str(error))
                knol_emit({"protocol": 1, "type": "error", "message": "오디오 파일을 재생 환경에 준비하지 못했습니다."})
                continue
            # Bridge validates generated RuntimeScene schema before enqueueing.
            knol_seq = command["seq"]
            knol_revision = command["revision"]
            previous_scene_id = knol_scene["sceneId"] if knol_scene else None
            previous_mode = knol_scene.get("mode") if knol_scene else None
            previous_ended = knol_scene.get("ended", False) if knol_scene else False
            previous_entry = knol_scene.get("presentationEntry") if knol_scene else None
            previous_session = knol_scene.get("audio", {}).get("sessionId") if knol_scene else None
            previous_text = knol_scene.get("dialogue", {}).get("text") if knol_scene else None
            previous_offset = knol_text_offset
            knol_scene = command["payload"]
            knol_resize(knol_scene)
            same_text = (previous_scene_id == knol_scene["sceneId"] and
                previous_mode == knol_scene.get("mode") and previous_entry == knol_scene.get("presentationEntry") and
                previous_text == knol_scene.get("dialogue", {}).get("text") and not previous_ended)
            requested_offset = knol_scene.get("dialogueOffset", 0)
            requested_offset = max(0, min(len(knol_scene.get("dialogue", {}).get("text", "")), requested_offset)) if type(requested_offset) is int else 0
            knol_text_offset = previous_offset if same_text else requested_offset
            knol_text_page = knol_text_page_for_offset(knol_dialogue_metrics(knol_scene)["pages"], knol_text_offset)
            transition = knol_scene.get("presentation", {}).get("transition")
            # Editing a revision preserves the current presentation clock and gate.
            # Restarting a one-cut story returns from ended to the same scene.
            presentation_restart = (previous_scene_id != knol_scene["sceneId"] or
                previous_mode != knol_scene.get("mode") or
                previous_entry != knol_scene.get("presentationEntry") or
                (previous_ended and not knol_scene.get("ended", False)))
            transition_available = bool(transition and knol_scene.get("mode") == "play")
            knol_transition_active = transition_available and (presentation_restart or knol_transition_active)
            knol_started = time.monotonic()
            if presentation_restart:
                knol_speaker_scroll.change(0)
                knol_choice_scroll.change(0)
                knol_presentation_started = knol_started
            knol_sync_effect_clocks(knol_scene, previous_session != knol_scene.get("audio", {}).get("sessionId") or previous_mode != knol_scene.get("mode") or (previous_ended and not knol_scene.get("ended", False)))
            if not knol_waiting_for_audio():
                knol_apply_audio(knol_scene, presentation_restart)
                if presentation_restart:
                    knol_start_native_transition(knol_scene)
            knol_pending = True
        if messages:
            renpy.restart_interaction()

screen knol_choice_popup():
    zorder 80
    modal knol_choices_visible()
    if knol_choices_visible():
        $ layout = knol_choice_layout(knol_scene)
        $ rect = layout["rect"]
        # A separate modal screen owns focus and blocks click-through to the story.
        add Solid("#08191699")
        # The modal keeps choice buttons exclusive while permitting deliberate back taps.
        if knol_scene.get("readerTapMode") == "halves":
            button:
                id "choice-back-input"
                xysize (int(knol_scene["width"] / 2), int(knol_scene["height"]))
                padding (0, 0)
                background None
                hover_background None
                sensitive knol_text_page > 0 or knol_scene.get("readerCanGoBack", False)
                action Function(knol_stage_tap)
        frame:
            id "choice-popup"
            xpos int(rect["x"])
            ypos int(rect["y"])
            xysize (int(rect["width"]), int(rect["height"]))
            padding (layout["padding"], layout["padding"])
            background Frame("ui/choice-panel.svg", 24, 24)
            fixed:
                text "이야기의 갈림길":
                    substitute False
                    font "NotoSansKR.ttf"
                    size 22
                    color "#bce6cf"
                    xalign .5
                text "어떻게 할까요?":
                    substitute False
                    font "NotoSansKR.ttf"
                    size 34
                    color "#fffdf5"
                    xalign .5
                    ypos 30
                viewport:
                    id "choice-list"
                    ypos layout["headerHeight"]
                    xysize (int(rect["width"] - layout["padding"] * 2 - (12 if layout["scroll"] else 0)), int(layout["listHeight"]))
                    mousewheel layout["scroll"]
                    draggable layout["scroll"]
                    yadjustment knol_choice_scroll
                    vbox:
                        spacing layout["gap"]
                        xfill True
                        for index, choice in enumerate(knol_scene["choices"]):
                            button:
                                id ("choice-" + choice["id"])
                                xfill True
                                ysize int(layout["buttonHeights"][index])
                                padding (24, 16)
                                background Frame("ui/choice-button.svg", 16, 16)
                                hover_background Frame("ui/choice-button-hover.svg", 16, 16)
                                default_focus index == 0
                                action Function(knol_text_input, "choiceSelected", choice["id"])
                                text knol_literal(choice["text"]):
                                    substitute False
                                    font "NotoSansKR.ttf"
                                    size layout["fontSize"]
                                    line_spacing 4
                                    color "#fffdf5"
                                    hover_color "#183331"
                                    xsize int(rect["width"] - layout["padding"] * 2 - 48 - (12 if layout["scroll"] else 0))
                                    text_align .5
                                    align (.5, .5)
                if layout["scroll"]:
                    vbar:
                        adjustment knol_choice_scroll
                        xpos int(rect["width"] - layout["padding"] * 2 - 6)
                        ypos layout["headerHeight"]
                        xysize (6, int(layout["listHeight"]))
                        base_bar Solid("#284e46")
                        thumb Solid("#bce6cf")

screen knol_stage():
    add Solid("#fffdf5")
    if not knol_audio_unlocked and (not knol_scene or knol_scene.get("mode") != "play"):
        key "mousedown_1" action Function(knol_unlock_audio)
    timer 0.05 repeat True action Function(knol_poll)
    if knol_scene:
        $ artwork_rect = knol_scene.get("artworkRect", {"x": 0, "y": 0, "width": knol_scene["width"], "height": knol_scene["height"]})
        viewport:
            id "artwork-clip"
            xpos int(artwork_rect["x"])
            ypos int(artwork_rect["y"])
            xysize (int(artwork_rect["width"]), int(artwork_rect["height"]))
            draggable False
            mousewheel False
            fixed:
                xpos -int(artwork_rect["x"])
                ypos -int(artwork_rect["y"])
                xysize (int(knol_scene["width"]), int(knol_scene["height"]))
                id ("visual-" + knol_scene["sceneId"])
                at Transform(function=knol_shake)
                if knol_scene.get("background"):
                    add knol_background(knol_scene)
                    if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
                        for effect in ([] if knol_scene.get("transitionOnly") else knol_target_effects("background")):
                            if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                                add knol_effect(effect, knol_scene.get("reducedMotion", False)) id ("background-effect-" + str(effect))
                for index, actor in enumerate(sorted(knol_scene["actors"], key=lambda a: a.get("depth", 0))):
                    $ rect = actor["rect"]
                    if actor.get("imagePath"):
                        add knol_actor_image(actor, knol_scene) xpos int(rect["x"]) ypos int(rect["y"]) at knol_actor_motion_atl(actor, knol_scene), knol_actor_shake_transform(actor, knol_scene)
                    else:
                        frame:
                            xpos int(rect["x"])
                            ypos int(rect["y"])
                            xysize (int(rect["width"]), int(rect["height"]))
                            padding (12, 12)
                            background Solid(knol_actor_colors[index % len(knol_actor_colors)])
                            text knol_literal(actor["name"]) substitute False color knol_ink size 32 font "NotoSansKR.ttf"
                if knol_scene.get("presentation", {}).get("look", {}).get("type") == "fractured-reality":
                    add "effects/crack.svg" alpha .35 xysize (int(knol_scene["width"]), int(knol_scene["height"]))
                if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
                    for effect in knol_scene.get("presentation", {}).get("effects", []):
                        if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                            $ target = effect.get("target", {})
                            if target.get("kind") == "actor":
                                for target_actor in knol_scene["actors"]:
                                    if target_actor["id"] == target.get("actorId"):
                                        $ target_rect = target_actor["rect"]
                                        add knol_actor_effect(effect, target_actor, knol_scene) xpos int(target_rect["x"]) ypos int(target_rect["y"]) id ("effect-" + str(effect))
        # Native stage input stays below dialogue controls, choices and audio/transition gates.
        button:
            id "stage-tap-input"
            xysize (int(knol_scene["width"]), int(knol_scene["height"]))
            padding (0, 0)
            background None
            hover_background None
            sensitive knol_ready and knol_scene.get("mode") == "play" and not knol_transition_active and not knol_waiting_for_audio() and (not knol_scene.get("ended") or (knol_scene.get("readerTapMode") == "halves" and knol_scene.get("readerCanGoBack", False)))
            action Function(knol_stage_tap)
        $ textbox = knol_textbox(knol_scene)
        $ dialogue_style = knol_scene.get("dialogueStyle", {"fontSize": 30, "speakerFontSize": 28, "padding": 24})
        $ padding = int(dialogue_style["padding"])
        $ text_size = int(dialogue_style["fontSize"])
        $ speaker_size = int(dialogue_style["speakerFontSize"])
        $ page_text_size = max(1, int(text_size * .5))
        $ dialogue_rects = knol_measure_dialogue(knol_scene)
        $ speaker_rect = dialogue_rects["speaker"]
        frame:
            id "textbox"
            at Transform(function=knol_shake, alpha=0 if knol_scene.get("transitionOnly") else 1)
            xpos int(textbox["x"])
            ypos int(textbox["y"])
            xysize (int(textbox["width"]), int(textbox["height"]))
            padding (0, 0)
            background Solid("#183331e8")
            button:
                id "dialogue-input"
                xpos int(dialogue_rects["body"]["x"])
                ypos int(dialogue_rects["body"]["y"] - textbox["y"])
                xsize int(dialogue_rects["body"]["width"])
                ysize int(dialogue_rects["body"]["height"])
                padding (0, 0)
                background None
                hover_background None
                sensitive knol_ready and knol_scene.get("mode") == "play" and not knol_transition_active and not knol_waiting_for_audio()
                action Function(knol_stage_tap)
                text knol_literal(knol_dialogue_metrics(knol_scene)["pages"][knol_text_page]):
                    substitute False
                    color "#fffdf5"
                    size text_size
                    font "NotoSansKR.ttf"
                    line_spacing 0
                    xsize int(dialogue_rects["body"]["width"])
            if len(knol_dialogue_metrics(knol_scene)["pages"]) > 1:
                hbox:
                    xpos int(textbox["width"] - padding - 44)
                    xanchor 1.0
                    ypos int(dialogue_rects["body"]["y"] - textbox["y"] + dialogue_rects["body"]["height"] + 4)
                    spacing 12
                    if knol_text_page > 0:
                        textbutton "‹ 이전":
                            text_font "NotoSansKR.ttf"
                            text_size page_text_size
                            text_color "#fffdf5"
                            text_hover_color "#bce6cf"
                            background None
                            hover_background None
                            ysize max(1, knol_dialogue_metrics(knol_scene)["controlsHeight"] - 4)
                            padding (4, 0)
                            action Function(knol_change_text_page, -1)
                    if knol_text_page < len(knol_dialogue_metrics(knol_scene)["pages"]) - 1:
                        textbutton "계속 ›":
                            text_font "NotoSansKR.ttf"
                            text_size page_text_size
                            text_color "#fffdf5"
                            text_hover_color "#bce6cf"
                            background None
                            hover_background None
                            ysize max(1, knol_dialogue_metrics(knol_scene)["controlsHeight"] - 4)
                            padding (4, 0)
                            action Function(knol_change_text_page, 1)
        frame:
            at Transform(function=knol_shake, alpha=0 if knol_scene.get("transitionOnly") else 1)
            xpos int(speaker_rect["x"])
            ypos int(speaker_rect["y"])
            xysize (int(speaker_rect["width"]), int(speaker_rect["height"]))
            padding (0, 0)
            background None
            viewport:
                xysize (max(1, int(speaker_rect["width"])), max(1, int(speaker_rect["height"])))
                mousewheel True
                draggable True
                yadjustment knol_speaker_scroll
                text knol_literal(knol_scene["dialogue"]["speaker"]) substitute False color "#bce6cf" size speaker_size font "NotoSansKR.ttf"
        vbar:
            at Transform(alpha=0 if knol_scene.get("transitionOnly") else 1)
            adjustment knol_speaker_scroll
            xpos int(speaker_rect["x"] + speaker_rect["width"] - 8)
            ypos int(speaker_rect["y"] + 3)
            xysize (4, max(1, int(speaker_rect["height"] - 6)))
            unscrollable "hide"
            base_bar Solid(knol_mint)
            thumb Solid(knol_paper)
        if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
            viewport:
                id "artwork-effects-clip"
                xpos int(artwork_rect["x"])
                ypos int(artwork_rect["y"])
                xysize (int(artwork_rect["width"]), int(artwork_rect["height"]))
                draggable False
                mousewheel False
                fixed:
                    xpos -int(artwork_rect["x"])
                    ypos -int(artwork_rect["y"])
                    xysize (int(knol_scene["width"]), int(knol_scene["height"]))
                    for effect in ([] if knol_scene.get("transitionOnly") else knol_target_effects("screen")):
                        if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                            add knol_effect(effect, knol_scene.get("reducedMotion", False)) id ("screen-effect-" + str(effect))
            if not knol_scene.get("transitionOnly") and (not knol_scene.get("choices") or knol_effect_step_pending()) and not knol_scene.get("ended") and knol_text_page == len(knol_dialogue_metrics(knol_scene)["pages"]) - 1:
                button:
                    xpos int(textbox["x"] + textbox["width"] - (140 if knol_effect_step_pending() else 44))
                    ypos int(dialogue_rects["body"]["y"] + dialogue_rects["body"]["height"])
                    xsize (140 if knol_effect_step_pending() else 44)
                    ysize knol_dialogue_metrics(knol_scene)["controlsHeight"]
                    padding (0, 0)
                    background None
                    hover_background None
                    action Function(knol_text_input, "advanceRequested")
                    text ("다음 효과 ›" if knol_effect_step_pending() else "›") color "#fffdf5" size (min(20, page_text_size) if knol_effect_step_pending() else page_text_size) font "NotoSansKR.ttf" align (.5, .5)
            if knol_transition_active and knol_should_use_native_transition(knol_scene):
                timer knol_transition_duration(knol_scene) action Function(knol_finish_transition)
            if (knol_transition_active or knol_scene.get("transitionOnly")) and not knol_should_use_native_transition(knol_scene):
                $ transition = knol_scene["presentation"]["transition"]
                # Use scene values: Ren'Py may cache config attributes in screen expressions.
                $ transition_width = int(knol_scene["width"])
                $ transition_height = int(knol_scene["height"])
                $ duration = .1 if knol_scene.get("reducedMotion") else transition.get("durationMs", 900) / 1000.0
                $ white = transition["type"] == "white-fade"
                frame:
                    at Transform(function=knol_transition_fade), Transform(function=knol_title_shake)
                    xysize (transition_width, transition_height)
                    background Solid("#ffffff" if white else "#080b12")
                    padding (min(80, int(transition_width * .06)), 16)
                    fixed:
                        xysize (transition_width - 2 * min(80, int(transition_width * .06)), transition_height - 32)
                        viewport:
                            xysize (transition_width - 2 * min(80, int(transition_width * .06)), max(80, transition_height - 140))
                            mousewheel True
                            draggable True
                            vbox:
                                xsize transition_width - 2 * min(80, int(transition_width * .06))
                                spacing 8
                                for field in ("cue", "title", "description"):
                                    text knol_literal(transition.get(field, "")) substitute False color (knol_ink if white else "#ffffff") size 24 font "NotoSansKR.ttf" xalign .5
                        if knol_transition_active and transition.get("mode") == "confirm":
                            button:
                                background Solid(knol_mint)
                                padding (24, 16)
                                xsize transition_width - 2 * min(80, int(transition_width * .06))
                                ysize 80
                                xalign .5
                                ypos transition_height - 112
                                action Function(knol_finish_transition)
                                viewport:
                                    mousewheel True
                                    draggable True
                                    text knol_button_text(transition.get("actionLabel", "계속")) substitute False font "NotoSansKR.ttf" size 28 color knol_ink xsize (transition_width - 2 * min(80, int(transition_width * .06)) - 48) text_align .5 xalign .5
                if knol_transition_active and transition.get("mode") != "confirm":
                    timer duration action Function(knol_finish_transition)
            if knol_manual_title() and not knol_transition_active and not knol_scene.get("ended"):
                # A title card is the visible background here. Screen/background
                # effects must sit above that card; actor targets stay attached
                # to their hidden actors rather than becoming full-screen effects.
                for effect in knol_target_effects("background") + knol_target_effects("screen"):
                    if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                        add knol_effect(effect, knol_scene.get("reducedMotion", False)) id ("title-effect-" + str(effect))
                textbutton ("다음 효과 ›" if knol_effect_step_pending() else "계속 ›"):
                    xalign .5
                    yalign .95
                    padding (24, 12)
                    text_font "NotoSansKR.ttf"
                    text_size 24
                    text_color "#fffdf5"
                    background Solid("#183331e8")
                    action Function(knol_text_input, "advanceRequested")
        if knol_ready and knol_scene.get("mode") == "play" and not knol_scene.get("ended") and not knol_transition_active and not knol_waiting_for_audio():
            key "K_RETURN" action Function(knol_text_input, "advanceRequested")
            key "K_SPACE" action Function(knol_text_input, "advanceRequested")
        if knol_waiting_for_audio():
            key "K_RETURN" action Function(knol_unlock_audio)
            key "K_SPACE" action Function(knol_unlock_audio)
            # The whole stage starts audio, but only the scene above the dialogue panel is washed:
            # a pale wash over the dark panel made its text and the host tools on it unreadable.
            $ gate_height = int(knol_scene["height"]) if knol_scene.get("transitionOnly") else max(1, int(textbox["y"]))
            button:
                xysize (int(knol_scene["width"]), int(knol_scene["height"]))
                background None
                hover_background None
                action Function(knol_unlock_audio)
                fixed:
                    xysize (int(knol_scene["width"]), int(knol_scene["height"]))
                    add Solid("#fffdf4cc") xysize (int(knol_scene["width"]), gate_height)
                    vbox:
                        xalign .5
                        yanchor .5
                        ypos gate_height // 2
                        xsize int(knol_scene["width"] - 48)
                        spacing 20
                        text "소리 켜고 시작" color knol_ink size int(text_size) font "NotoSansKR.ttf" xalign .5
                        text "무대를 누르거나 Enter·Space로 소리와 이야기를 시작하세요." color knol_ink size int(text_size) font "NotoSansKR.ttf" text_align .5 xalign .5
    else:
        text "편집 화면 연결 중…" color knol_ink size 32 font "NotoSansKR.ttf" align (0.5, 0.5)

label start:
    show screen knol_choice_popup
    call screen knol_stage
    jump start
