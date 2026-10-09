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
            (audio.get("music", {}).get("action") == "play" or audio.get("ambience", {}).get("action") == "play" or audio.get("sounds")))

    def knol_unlock_audio():
        global knol_audio_unlocked, knol_presentation_started, knol_audio_started, knol_pending
        knol_audio_unlocked = True
        if knol_scene and knol_scene.get("mode") == "play":
            knol_presentation_started = time.monotonic()
            knol_apply_audio(knol_scene, True)
            knol_start_native_transition(knol_scene)
            knol_audio_started = knol_presentation_started
            knol_sync_effect_clocks(knol_scene, True)
            knol_pending = True
        renpy.restart_interaction()

    def knol_textbox(scene):
        return scene.get("textboxRect", {"x": 48, "y": 510, "width": 1184, "height": 174})

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
        return Transform(background["imagePath"], xysize=(config.screen_width, config.screen_height),
            fit=background.get("fit", "cover"), align=(.5, .5), matrixcolor=knol_look(scene), function=partial(knol_target_shake, kind="background"))

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

    def knol_poll():
        global knol_scene, knol_seq, knol_revision, knol_pending, knol_started, knol_last_viewport, knol_ready, knol_transition_active, knol_presentation_started, knol_reported_audio
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
                    "renderMs": (time.monotonic() - knol_started) * 1000})
                knol_reported_audio = audio_signature
                knol_pending = False
        raw = renpy.emscripten.run_script_string("window.knolBridge.drain()")
        messages = json.loads(raw)
        for command in messages:
            if command["seq"] <= knol_seq or command["revision"] <= knol_revision:
                continue
            try:
                knol_install_audio(command.get("audioResources", []))
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
            knol_scene = command["payload"]
            knol_resize(knol_scene)
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
                knol_presentation_started = knol_started
            knol_sync_effect_clocks(knol_scene, previous_session != knol_scene.get("audio", {}).get("sessionId") or previous_mode != knol_scene.get("mode") or (previous_ended and not knol_scene.get("ended", False)))
            if not knol_waiting_for_audio():
                knol_apply_audio(knol_scene, presentation_restart)
                if presentation_restart:
                    knol_start_native_transition(knol_scene)
            knol_pending = True
        if messages:
            renpy.restart_interaction()

screen knol_stage():
    add Solid(knol_paper)
    if not knol_audio_unlocked and (not knol_scene or knol_scene.get("mode") != "play"):
        key "mousedown_1" action Function(knol_unlock_audio)
    timer 0.05 repeat True action Function(knol_poll)
    if knol_scene:
        fixed:
            id ("visual-" + knol_scene["sceneId"])
            at Transform(function=knol_shake)
            if knol_scene.get("background"):
                add knol_background(knol_scene)
                if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
                    for effect in knol_target_effects("background"):
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
                add "effects/crack.svg" alpha .35 xysize (config.screen_width, config.screen_height)
            if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
                for effect in knol_scene.get("presentation", {}).get("effects", []):
                    if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                        $ target = effect.get("target", {})
                        if target.get("kind") == "actor":
                            for target_actor in knol_scene["actors"]:
                                if target_actor["id"] == target.get("actorId"):
                                    $ target_rect = target_actor["rect"]
                                    add knol_actor_effect(effect, target_actor, knol_scene) xpos int(target_rect["x"]) ypos int(target_rect["y"]) id ("effect-" + str(effect))
        $ textbox = knol_textbox(knol_scene)
        $ dialogue_style = knol_scene.get("dialogueStyle", {"fontSize": 30, "speakerFontSize": 28, "padding": 24})
        $ padding = int(dialogue_style["padding"])
        $ text_size = int(dialogue_style["fontSize"])
        $ speaker_size = int(dialogue_style["speakerFontSize"])
        frame:
            id "textbox"
            at Transform(function=knol_shake)
            xpos int(textbox["x"])
            ypos int(textbox["y"])
            xysize (int(textbox["width"]), int(textbox["height"]))
            padding (padding, 16)
            background Solid(knol_mint)
            vbox:
                spacing 8
                text knol_literal(knol_scene["dialogue"]["speaker"]) substitute False color knol_ink size speaker_size font "NotoSansKR.ttf"
                viewport:
                    xsize int(textbox["width"] - padding * 2)
                    ysize int(textbox["height"] - speaker_size - 40)
                    mousewheel True
                    draggable True
                    text knol_literal(knol_scene["dialogue"]["text"]) substitute False color knol_ink size text_size font "NotoSansKR.ttf"
        if knol_scene.get("mode") == "play" and not knol_waiting_for_audio():
            for effect in knol_target_effects("screen"):
                if effect["type"] != "shake" and (not knol_scene.get("reducedMotion") or effect["type"] in ("crack", "screen-crack", "spotlight", "fade-black")):
                    add knol_effect(effect, knol_scene.get("reducedMotion", False)) id ("screen-effect-" + str(effect))
            if knol_scene.get("choices"):
                frame:
                    xpos int(config.screen_width * .1875 if config.screen_width >= 1000 else 24)
                    ypos int(min(110, textbox["y"] * .2))
                    xsize int(config.screen_width * .625 if config.screen_width >= 1000 else config.screen_width - 48)
                    padding (20, 20)
                    background Solid(knol_paper)
                    vbox:
                        spacing 10
                        for choice in knol_scene["choices"]:
                            textbutton knol_button_text(choice["text"]):
                                text_font "NotoSansKR.ttf"
                                text_size 28
                                text_color knol_ink
                                xfill True
                                action Function(knol_input, "choiceSelected", choice["id"])
            elif not knol_scene.get("ended"):
                textbutton "다음":
                    xpos int(textbox["x"] + textbox["width"] - 122)
                    ypos int(textbox["y"] + textbox["height"] - 42)
                    text_font "NotoSansKR.ttf"
                    text_size 24
                    text_color knol_ink
                    action Function(knol_input, "advanceRequested")
            if knol_transition_active and knol_should_use_native_transition(knol_scene):
                timer knol_transition_duration(knol_scene) action Function(knol_finish_transition)
            if knol_transition_active and not knol_should_use_native_transition(knol_scene):
                $ transition = knol_scene["presentation"]["transition"]
                $ duration = .1 if knol_scene.get("reducedMotion") else transition.get("durationMs", 900) / 1000.0
                $ white = transition["type"] == "white-fade"
                frame:
                    at Transform(function=knol_transition_fade)
                    xysize (config.screen_width, config.screen_height)
                    background Solid("#ffffff" if white else "#080b12")
                    padding (min(80, int(config.screen_width * .06)), 40)
                    vbox:
                        align (.5, .5)
                        spacing 24
                        for field in ("cue", "title", "description"):
                            text knol_literal(transition.get(field, "")) substitute False color (knol_ink if white else "#ffffff") size 36 font "NotoSansKR.ttf" xalign .5
                        if transition.get("mode") == "confirm":
                            textbutton knol_button_text(transition.get("actionLabel", "계속")):
                                text_font "NotoSansKR.ttf"
                                text_size 32
                                text_color knol_ink
                                background Solid(knol_mint)
                                padding (24, 16)
                                xalign .5
                                action Function(knol_finish_transition)
                if transition.get("mode") != "confirm":
                    timer duration action Function(knol_finish_transition)
        if knol_waiting_for_audio():
            button:
                xysize (config.screen_width, config.screen_height)
                background Solid("#fffdf4cc")
                action Function(knol_unlock_audio)
                vbox:
                    align (.5, .5)
                    xsize int(config.screen_width - 48)
                    spacing 20
                    text "소리 켜고 시작" color knol_ink size int(text_size) font "NotoSansKR.ttf" xalign .5
                    text "무대를 눌러 소리와 이야기를 시작하세요." color knol_ink size int(text_size) font "NotoSansKR.ttf" text_align .5 xalign .5
    else:
        text "편집 화면 연결 중…" color knol_ink size 32 font "NotoSansKR.ttf" align (0.5, 0.5)

label start:
    call screen knol_stage
    jump start
