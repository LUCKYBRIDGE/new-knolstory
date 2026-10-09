# The host resolves playback path. The presenter only executes desired channel state.
init python:
    import time
    knol_music_identity = None
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

    def knol_apply_audio(scene, entrance):
        global knol_ambience_identity, knol_ambience_start_count, knol_music_identity, knol_audio_pending, knol_audio_started, knol_music_start_count, knol_audio_session
        audio = scene.get("audio", {})
        music = audio.get("music", {"action": "maintain"})
        if scene.get("mode") != "play":
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
            renpy.music.stop(channel="music")
            renpy.music.stop(channel="knol_ambience")
            knol_ambience_identity = None
            knol_music_identity = None
            knol_audio_session = session
        action = music.get("action")
        if action == "stop":
            if knol_music_identity is not None:
                renpy.music.stop(channel="music", fadeout=music.get("fadeOutMs", 0) / 1000.0)
            knol_music_identity = None
        elif action == "play":
            identity = (music["audioPath"], music.get("loop", True))
            if knol_music_identity != identity:
                renpy.music.play(music["audioPath"], channel="music", loop=identity[1],
                    fadein=music.get("fadeInMs", 0) / 1000.0, fadeout=music.get("fadeOutMs", 0) / 1000.0)
                knol_music_identity = identity
                knol_music_start_count += 1
            renpy.music.set_volume(music.get("volume", 1), channel="music")
        ambience = audio.get("ambience", {"action": "stop", "fadeOutMs": 0})
        action = ambience.get("action")
        if action == "stop":
            if knol_ambience_identity is not None:
                renpy.music.stop(channel="knol_ambience", fadeout=ambience.get("fadeOutMs", 0) / 1000.0)
            knol_ambience_identity = None
        elif action == "play":
            identity = (ambience["audioPath"], ambience.get("loop", True))
            if knol_ambience_identity != identity:
                renpy.music.play(ambience["audioPath"], channel="knol_ambience", loop=identity[1],
                    fadein=ambience.get("fadeInMs", 0) / 1000.0, fadeout=ambience.get("fadeOutMs", 0) / 1000.0)
                knol_ambience_identity = identity
                knol_ambience_start_count += 1
            renpy.music.set_volume(ambience.get("volume", 1), channel="knol_ambience")
        if entrance:
            # Cancel delayed audio from the cut we left. Existing music continues.
            for index in range(8):
                renpy.music.stop(channel="knol_sound_" + str(index))
            knol_audio_pending = [dict(sound, channel="knol_sound_" + str(index % 8)) for index, sound in enumerate(audio.get("sounds", []))]
            knol_audio_started = time.monotonic()

    def knol_poll_audio(transition_active, now=None):
        global knol_audio_pending, knol_sound_play_count
        if transition_active:
            return
        elapsed = (time.monotonic() if now is None else now) - knol_audio_started
        pending = []
        for index, sound in enumerate(knol_audio_pending):
            if elapsed < sound.get("delayMs", 0) / 1000.0:
                pending.append(sound)
                continue
            channel = sound["channel"]
            renpy.music.set_volume(sound.get("volume", 1), channel=channel)
            renpy.music.play(sound["audioPath"], channel=channel, loop=False)
            knol_sound_play_count += 1
        knol_audio_pending = pending

    def knol_audio_state():
        return {"unlocked": globals().get("knol_audio_unlocked", True), "musicPath": renpy.music.get_playing(channel="music"),
            "musicPosition": renpy.music.get_pos(channel="music"),
            "ambiencePath": renpy.music.get_playing(channel="knol_ambience"), "ambienceStartCount": knol_ambience_start_count,
            "musicStartCount": knol_music_start_count, "soundPlayCount": knol_sound_play_count,
            "soundPaths": [path for path in [renpy.music.get_playing(channel="knol_sound_" + str(index)) for index in range(8)] if path]}
