# Resolved presentation only. Story flow and actor geometry remain in Runtime Core.
init python:
    def knol_literal(value):
        # Ren'Py braces are text tags even when substitution is disabled.
        return value.replace("{", "{{")

    def knol_button_text(value):
        return Text(knol_literal(value), substitute=False, font="NotoSansKR.ttf", size=knol_scene.get("dialogueStyle", {}).get("fontSize", 28) if knol_scene else 28, color=knol_ink)

    def knol_look(scene):
        settings = scene.get("presentation", {}).get("look", {})
        look = settings.get("type")
        intensity = settings.get("intensity", "normal")
        if look == "flashback":
            return SaturationMatrix({"soft": .65, "normal": .35, "strong": .12}[intensity]) * TintMatrix({"soft": "#f2e4c8", "normal": "#e6c995", "strong": "#d9b46f"}[intensity])
        if look == "fractured-reality":
            return SaturationMatrix({"soft": .85, "normal": .72, "strong": .5}[intensity]) * ContrastMatrix({"soft": 1.05, "normal": 1.15, "strong": 1.3}[intensity]) * BrightnessMatrix({"soft": -.04, "normal": -.08, "strong": -.14}[intensity])
        return IdentityMatrix()

    knol_effect_clocks = {}

    def knol_sync_effect_clocks(scene, reset=False):
        global knol_effect_clocks
        now = time.monotonic()
        active = {e.get("originEntry") for e in scene.get("presentation", {}).get("effects", []) if e.get("originEntry")}
        knol_effect_clocks = {key: knol_effect_clocks.get(key, now) for key in active} if not reset else {key: now for key in active}

    def knol_effect_elapsed(effect):
        start = knol_effect_clocks.get(effect.get("originEntry"), knol_presentation_started)
        elapsed = time.monotonic() - start - knol_effect_delay(effect)
        if elapsed >= 0 and effect.get("repeat") == "loop" and not knol_scene.get("reducedMotion"):
            elapsed %= effect.get("periodMs", 2400) / 1000.0
        return elapsed

    def knol_target_effects(kind, actor_id=None):
        return [effect for effect in knol_scene.get("presentation", {}).get("effects", [])
            if effect.get("target", {}).get("kind", "screen") == kind and
            (kind != "actor" or effect.get("target", {}).get("actorId") == actor_id)]

    def knol_target_shake(trans, st, at, kind="screen", actor_id=None):
        trans.xoffset = 0
        trans.yoffset = 0
        if knol_scene.get("mode") == "play" and not knol_scene.get("reducedMotion") and not knol_transition_active and not knol_waiting_for_audio():
            for effect in knol_target_effects(kind, actor_id):
                elapsed = knol_effect_elapsed(effect)
                if effect["type"] == "shake" and 0 <= elapsed < .6:
                    amount = {"soft": 4, "normal": 7, "strong": 12}[effect.get("intensity", "normal")]
                    wave = [0, -1, .8, -.6, .4, -.2, 0]
                    trans.xoffset += wave[min(int(elapsed / .1), 6)] * amount
                    trans.yoffset += abs(trans.xoffset) / 3
        return .016

    def knol_actor_motion_state(actor, scene):
        motion = actor.get("motion")
        alpha = actor.get("opacity", 1)
        state = {"start_alpha": alpha, "end_alpha": alpha, "start_xoffset": 0, "end_xoffset": 0, "remaining": 0, "wait": 0}
        if not motion:
            return state
        duration = motion["durationMs"] / 1000.0
        elapsed = time.monotonic() - knol_presentation_started - motion["delayMs"] / 1000.0
        progress = 1 if scene.get("mode") != "play" or scene.get("reducedMotion") else max(0, min(1, elapsed / max(.001, duration)))
        if (knol_transition_active or knol_waiting_for_audio(scene)) and scene.get("mode") == "play" and not scene.get("reducedMotion"):
            progress = 0
        if motion["type"] == "fade-in":
            state["start_alpha"] = alpha * progress
            state["end_alpha"] = alpha
        elif motion["type"] == "fade-out":
            state["start_alpha"] = alpha * (1 - progress)
            state["end_alpha"] = 0
        elif motion["type"] == "move":
            state["start_xoffset"] = motion["offsetX"] * (1 - progress)
            state["end_xoffset"] = 0
        state["wait"] = 0 if scene.get("mode") != "play" or scene.get("reducedMotion") else max(0, -elapsed)
        state["remaining"] = 0 if scene.get("mode") != "play" or scene.get("reducedMotion") else max(0, duration * (1 - progress))
        return state

    def knol_actor_motion_value(actor, scene, key):
        return knol_actor_motion_state(actor, scene)[key]

    def knol_actor_shake(trans, st, at, actor, scene):
        knol_target_shake(trans, st, at, "actor", actor["id"])
        return .016

    def knol_actor_image(actor, scene):
        matrix = knol_look(scene)
        if actor.get("emphasis") == "dim":
            matrix = BrightnessMatrix(-0.28) * matrix
        if actor.get("spectral"):
            matrix = TintMatrix("#b5d8ff") * matrix
        return Transform(actor["imagePath"], xysize=(int(actor["rect"]["width"]), int(actor["rect"]["height"])), \
            xzoom=-1 if actor.get("flipX") else 1, matrixcolor=matrix)

    def knol_transition_duration(scene):
        transition = scene.get("presentation", {}).get("transition", {})
        return .1 if scene.get("reducedMotion") else transition.get("durationMs", 900) / 1000.0

    def knol_should_use_native_transition(scene):
        transition = scene.get("presentation", {}).get("transition")
        if not transition or scene.get("mode") != "play" or transition.get("mode") == "confirm":
            return False
        return transition.get("type") in ("fade-black", "white-fade", "dissolve")

    knol_native_transition_phase = None

    def knol_start_native_transition(scene):
        global knol_native_transition_phase
        transition = scene.get("presentation", {}).get("transition", {})
        phase = (scene.get("sceneId"), scene.get("presentationEntry"), scene.get("mode"))
        if knol_native_transition_phase == phase or not knol_should_use_native_transition(scene):
            return
        knol_native_transition_phase = phase
        duration = knol_transition_duration(scene)
        kind = transition.get("type")
        if kind == "dissolve":
            native = Dissolve(duration)
        else:
            color = "#ffffff" if kind == "white-fade" else "#080b12"
            native = Fade(duration * .4, duration * .1, duration * .5, color=color)
        renpy.transition(native, layer="screens", always=True, force=True)

    def knol_input(kind, choice_id=None):
        if not knol_scene or knol_scene.get("mode") != "play" or knol_scene.get("ended") or knol_transition_active or knol_waiting_for_audio():
            return
        event = {"protocol": 1, "type": kind, "sceneId": knol_scene["sceneId"], "revision": knol_revision}
        if choice_id is not None:
            event["choiceId"] = choice_id
        knol_emit(event)

    def knol_finish_transition():
        global knol_transition_active, knol_presentation_started
        knol_transition_active = False
        knol_presentation_started = time.monotonic()
        knol_sync_effect_clocks(knol_scene, True)
        global knol_audio_started
        knol_audio_started = knol_presentation_started
        knol_emit({"protocol": 1, "type": "presentationDone", "sceneId": knol_scene["sceneId"], "revision": knol_revision})
        renpy.restart_interaction()

    def knol_effect_delay(effect):
        return effect.get("delayMs", 1000 if effect.get("trigger") == "after-delay" else 0) / 1000.0

    def knol_effect_alpha(trans, st, at, effect, duration=0.8, peak=0.4):
        if knol_transition_active:
            trans.alpha = 0
            return .016
        elapsed = knol_effect_elapsed(effect)
        trans.alpha = 0 if elapsed < 0 or elapsed > duration else peak * min(elapsed / (duration * .2), 1, (duration - elapsed) / (duration * .35))
        return .016

    def knol_shake(trans, st, at):
        return knol_target_shake(trans, st, at)

    def knol_transition_fade(trans, st, at):
        transition = knol_scene.get("presentation", {}).get("transition", {})
        duration = knol_transition_duration(knol_scene)
        elapsed = time.monotonic() - knol_presentation_started
        trans.alpha = 1 if transition.get("mode") == "confirm" else max(0, min(1, (duration - elapsed) / max(.001, duration * .7)))
        return .016

    def knol_effect(effect, reduced, size=None):
        kind = effect["type"]
        if kind in ("crack", "screen-crack"):
            displayable = "effects/crack.svg"
        elif kind == "spotlight":
            displayable = "effects/spotlight.svg"
        else:
            displayable = Solid("#bd253a" if kind == "flash-red" else "#ffffff" if kind == "flash" else "#080b12")
        peak = .22 if reduced else 1 if kind == "fade-black" else {"soft": .25, "normal": .4, "strong": .65}[effect.get("intensity", "normal")]
        duration = 1.8 if reduced or kind in ("crack", "screen-crack") else .8
        from functools import partial
        return Transform(displayable, xysize=size or (config.screen_width, config.screen_height), function=partial(knol_effect_alpha,
            effect=effect, duration=duration, peak=peak))

    def knol_actor_effect(effect, actor, scene):
        size = (int(actor["rect"]["width"]), int(actor["rect"]["height"]))
        mask = Transform(actor.get("imagePath", Solid("#fff")), xysize=size, xzoom=-1 if actor.get("flipX") else 1)
        overlay = knol_effect(effect, scene.get("reducedMotion", False), size)
        return AlphaMask(overlay, mask)

transform knol_actor_motion_atl(actor, scene):
    alpha knol_actor_motion_value(actor, scene, "start_alpha")
    xoffset knol_actor_motion_value(actor, scene, "start_xoffset")
    linear knol_actor_motion_value(actor, scene, "remaining") alpha knol_actor_motion_value(actor, scene, "end_alpha") xoffset knol_actor_motion_value(actor, scene, "end_xoffset")

transform knol_actor_shake_transform(actor, scene):
    function renpy.curry(knol_actor_shake)(actor=actor, scene=scene)
