# The host resolves playback path. The presenter only executes desired channel state.
init python:
    def knol_audio_filename(cue):
        if cue.get("sourceStartMs") is None and cue.get("sourceEndMs") is None:
            return cue["audioPath"]
        spec = "from %.3f" % (cue.get("sourceStartMs", 0) / 1000.0)
        if cue.get("sourceEndMs") is not None:
            spec += " to %.3f" % (cue["sourceEndMs"] / 1000.0)
        return "<" + spec + ">" + cue["audioPath"]

    def knol_audio_source_path(path):
        return path.split(">", 1)[1] if path and path.startswith("<") and ">" in path else path

    import time
    knol_music_identity = None
    knol_music_sequence = None
    knol_ambience_sequence = None
    knol_ambience_identity = None
    knol_audio_session = None
    knol_audio_pending = []
    knol_audio_started = 0
    knol_music_start_count = 0
    knol_sound_play_count = 0
    knol_ambience_start_count = 0
    renpy.music.register_channel("knol_ambience", mixer="music", loop=True)
    for knol_channel_index in range(8):
        renpy.music.register_channel("knol_sound_" + str(knol_channel_index), mixer="sfx", loop=False)

    def knol_channel_sequence(channel):
        return knol_music_sequence if channel == "music" else knol_ambience_sequence

    def knol_set_channel_sequence(channel, state):
        global knol_music_sequence, knol_ambience_sequence
        if channel == "music":
            knol_music_sequence = state
        else:
            knol_ambience_sequence = state

    def knol_cancel_music_sequence(channel="music"):
        knol_set_channel_sequence(channel, None)

    def knol_start_music_sequence(cue, now, channel="music"):
        global knol_music_identity, knol_ambience_identity
        clips = [dict(clip) for clip in cue["clips"]]
        identity = (cue["entryId"], cue["id"], clips)
        state = knol_channel_sequence(channel)
        if state and state["identity"] == identity:
            return
        renpy.music.stop(channel=channel)
        if channel == "music":
            knol_music_identity = None
        else:
            knol_ambience_identity = None
        knol_set_channel_sequence(channel, {"identity": identity, "clips": clips, "started": now,
            "index": None, "fading": False, "finished": False})
        knol_poll_music_sequence(now, channel)

    def knol_poll_music_sequence(now, channel="music"):
        global knol_music_start_count, knol_ambience_start_count
        state = knol_channel_sequence(channel)
        if not state or state["finished"]:
            return
        elapsed_ms = max(0, round((now - state["started"]) * 1000))
        boundary_ms = 0
        for index, clip in enumerate(state["clips"]):
            duration_ms = clip["sourceEndMs"] - clip.get("sourceStartMs", 0)
            end_ms = boundary_ms + duration_ms
            if elapsed_ms < end_ms:
                if state["index"] != index:
                    offset_ms = max(0, round(elapsed_ms - boundary_ms))
                    active = dict(clip, sourceStartMs=clip.get("sourceStartMs", 0) + offset_ms)
                    renpy.music.set_volume(clip.get("volume", 1), channel=channel)
                    renpy.music.play(knol_audio_filename(active), channel=channel, loop=False,
                        fadein=clip.get("fadeInMs", 0) / 1000.0)
                    state["index"] = index
                    state["fading"] = False
                    if channel == "music":
                        knol_music_start_count += 1
                    else:
                        knol_ambience_start_count += 1
                fade_ms = min(duration_ms, clip.get("fadeOutMs", 0))
                if fade_ms and elapsed_ms >= end_ms - fade_ms and not state["fading"]:
                    renpy.music.stop(channel=channel, fadeout=max(0, end_ms - elapsed_ms) / 1000.0)
                    state["fading"] = True
                return
            boundary_ms = end_ms
        renpy.music.stop(channel=channel)
        state["finished"] = True

    def knol_apply_audio(scene, entrance, started=None):
        global knol_ambience_identity, knol_ambience_start_count, knol_music_identity, knol_audio_pending, knol_audio_started, knol_music_start_count, knol_audio_session
        actual_now = time.monotonic() if started is None else started
        audio = scene.get("audio", {})
        music = audio.get("music", {"action": "maintain"})
        if scene.get("mode") != "play":
            knol_cancel_music_sequence()
            knol_cancel_music_sequence("knol_ambience")
            renpy.music.stop(channel="music")
            renpy.music.stop(channel="knol_ambience")
            knol_ambience_identity = None
            for index in range(8):
                renpy.music.stop(channel="knol_sound_" + str(index))
            knol_music_identity = None
            knol_audio_pending = []
            return
        session = audio.get("sessionId")
        if session != knol_audio_session:
            knol_cancel_music_sequence()
            knol_cancel_music_sequence("knol_ambience")
            knol_audio_pending = []
            renpy.music.stop(channel="music")
            renpy.music.stop(channel="knol_ambience")
            knol_ambience_identity = None
            knol_music_identity = None
            knol_audio_session = session
        action = music.get("action")
        if action == "stop":
            if knol_music_identity is not None or knol_music_sequence is not None:
                renpy.music.stop(channel="music", fadeout=music.get("fadeOutMs", 0) / 1000.0)
            knol_music_identity = None
            knol_cancel_music_sequence()
        elif action == "sequence":
            knol_start_music_sequence(music, actual_now)
        elif action == "play":
            knol_cancel_music_sequence()
            identity = (knol_audio_filename(music), music.get("loop", True))
            if knol_music_identity != identity:
                renpy.music.play(identity[0], channel="music", loop=identity[1],
                    fadein=music.get("fadeInMs", 0) / 1000.0, fadeout=music.get("fadeOutMs", 0) / 1000.0)
                knol_music_identity = identity
                knol_music_start_count += 1
            renpy.music.set_volume(music.get("volume", 1), channel="music")
        ambience = audio.get("ambience", {"action": "stop", "fadeOutMs": 0})
        action = ambience.get("action")
        if action == "stop":
            if knol_ambience_identity is not None or knol_ambience_sequence is not None:
                renpy.music.stop(channel="knol_ambience", fadeout=ambience.get("fadeOutMs", 0) / 1000.0)
            knol_ambience_identity = None
            knol_cancel_music_sequence("knol_ambience")
        elif action == "sequence":
            knol_start_music_sequence(ambience, actual_now, "knol_ambience")
        elif action == "play":
            knol_cancel_music_sequence("knol_ambience")
            identity = (knol_audio_filename(ambience), ambience.get("loop", True))
            if knol_ambience_identity != identity:
                renpy.music.play(identity[0], channel="knol_ambience", loop=identity[1],
                    fadein=ambience.get("fadeInMs", 0) / 1000.0, fadeout=ambience.get("fadeOutMs", 0) / 1000.0)
                knol_ambience_identity = identity
                knol_ambience_start_count += 1
            renpy.music.set_volume(ambience.get("volume", 1), channel="knol_ambience")
        if entrance:
            # Cancel delayed audio from the cut we left. Existing music continues.
            for index in range(8):
                renpy.music.stop(channel="knol_sound_" + str(index))
            knol_audio_pending = [dict(sound, channel="knol_sound_" + str(index % 8)) for index, sound in enumerate(audio.get("sounds", []))]
            knol_audio_started = actual_now

    def knol_poll_audio(transition_active, now=None):
        global knol_audio_pending, knol_sound_play_count
        actual_now = time.monotonic() if now is None else now
        knol_poll_music_sequence(actual_now)
        knol_poll_music_sequence(actual_now, "knol_ambience")
        if transition_active:
            return
        elapsed = actual_now - knol_audio_started
        pending = []
        for index, sound in enumerate(knol_audio_pending):
            if elapsed < sound.get("delayMs", 0) / 1000.0:
                pending.append(sound)
                continue
            channel = sound["channel"]
            renpy.music.set_volume(sound.get("volume", 1), channel=channel)
            renpy.music.play(knol_audio_filename(sound), channel=channel, loop=False)
            knol_sound_play_count += 1
        knol_audio_pending = pending

    def knol_audio_state():
        return {"unlocked": globals().get("knol_audio_unlocked", True), "musicPath": knol_audio_source_path(renpy.music.get_playing(channel="music")),
            "musicPosition": renpy.music.get_pos(channel="music"),
            "ambiencePath": knol_audio_source_path(renpy.music.get_playing(channel="knol_ambience")), "ambienceStartCount": knol_ambience_start_count,
            "musicStartCount": knol_music_start_count, "soundPlayCount": knol_sound_play_count,
            "soundPaths": [knol_audio_source_path(path) for path in [renpy.music.get_playing(channel="knol_sound_" + str(index)) for index in range(8)] if path]}
