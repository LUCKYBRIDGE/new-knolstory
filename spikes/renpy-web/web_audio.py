"""Gapless loops for the pinned Ren'Py Web audio (renpy/common/_audio.js, MIT).

Ren'Py Web starts the next round of a looping file only when the browser reports the current round ended
(`onended`). That event runs on the page's main thread, so a busy page leaves a silence at every loop point
(measured 64-101ms on a busy page, ~5ms when idle; 2026-11-27). This patch starts the queued next round of the
same file at the exact moment the current round ends, using the Web Audio clock, and cancels that booking
whenever Ren'Py stops, replaces, fades or pauses the channel. Everything else is left as Ren'Py wrote it.

The build writes the patched copy to the game folder, where Ren'Py's loader finds it before renpy/common.
"""
import hashlib
from pathlib import Path

# The reviewed renpy/common/_audio.js of Ren'Py 8.5.3. A different SDK needs this patch reviewed again.
SOURCE_SHA256 = 'b40467d06b40f98e3cb83abd3b840db730e6bb8275d49fba22fc06de38e51879'

HELPERS = '''
/**
 * KnolStory patch (spikes/renpy-web/web_audio.py): start the queued next round of the same file exactly
 * when the current round ends, on the Web Audio clock, instead of waiting for `onended` on a busy page.
 */
let knol_schedule_queued = (c) => {
    const p = c.playing;
    const q = c.queued;

    if (c.video || c.paused || c.knol_no_schedule || p === null || q === null) {
        return;
    }

    if (p.started === null || p.source === null || p.buffer === null || p.fadeout !== null) {
        return;
    }

    if (q.started !== null || q.source === null || q.file !== p.file || q.fadein > 0 || q.synchro_start) {
        return;
    }

    if (p.filter !== null || q.filter !== null || q.relative_volume !== p.relative_volume) {
        return;
    }

    const length = (p.end >= 0 ? p.end : p.buffer.duration) - p.start;
    const when = Math.max(context.currentTime, p.started + length);

    renpyAudio.connectFilter(q.filter, q.source, c.destination);

    if (q.end >= 0) {
        q.source.start(when, q.start, q.end - q.start);
    } else {
        q.source.start(when, q.start);
    }

    q.started = when;
    q.knol_scheduled = true;
};

/**
 * Cancels a booked next round, leaving it queued as Ren'Py expects (not started, with a fresh source).
 */
let knol_unschedule_queued = (c) => {
    const q = c.queued;

    if (q === null || !q.knol_scheduled) {
        return;
    }

    q.source.onended = null;

    try {
        q.source.stop();
    } catch (e) {
    }

    renpyAudio.disconnectFilter(q.filter, q.source, c.destination);

    const source = context.createBufferSource();
    source.buffer = q.buffer;
    source.onended = () => { on_end(c); };

    q.source = source;
    q.started = null;
    q.knol_scheduled = false;
};

'''

# (anchor, replacement) pairs; each anchor must appear exactly once.
EDITS = [
    # Helpers sit before on_end, which they reference.
    ('/**\n * Called when a channel ends naturally, to move things along.\n */\nlet on_end = (c) => {\n'
     '    if (c.playing !== null && c.playing.started !== null) {\n        stop_playing(c);\n    }\n\n'
     '    start_playing(c);\n};',
     HELPERS +
     '/**\n * Called when a channel ends naturally, to move things along.\n */\nlet on_end = (c) => {\n'
     '    if (c.playing !== null && c.playing.started !== null) {\n        stop_playing(c);\n    }\n\n'
     '    c.knol_no_schedule = false;\n    start_playing(c);\n    knol_schedule_queued(c);\n};'),
    # A round that has just started books the next one if it is already waiting.
    ('    setValue(c.relative_volume.gain, p.relative_volume);\n\n    p.started = context.currentTime;\n};',
     '    setValue(c.relative_volume.gain, p.relative_volume);\n\n    p.started = context.currentTime;\n'
     '    knol_schedule_queued(c);\n};'),
    # Pausing stops the current round; the booked one must not start on its own.
    ('let pause_playing = (c) => {\n\n    if (c.paused) {\n        return;\n    }\n',
     'let pause_playing = (c) => {\n\n    knol_unschedule_queued(c);\n\n    if (c.paused) {\n        return;\n    }\n'),
    # The same file arriving in the queue (a loop's next round) is booked right away.
    ('        c.queued.source.onended = () => { on_end(c); };\n\n        start_playing(c);\n    }',
     '        c.queued.source.onended = () => { on_end(c); };\n\n        start_playing(c);\n'
     '        knol_schedule_queued(c);\n    }'),
    # Replacing what is queued cancels a booking first.
    ('    if (c.playing === null) {\n        c.playing = q;\n        c.paused = false;\n    } else {\n'
     '        c.queued = q;\n        if (c.playing.file === file) {',
     '    if (c.playing === null) {\n        c.playing = q;\n        c.paused = false;\n    } else {\n'
     '        knol_unschedule_queued(c);\n        c.queued = q;\n        if (c.playing.file === file) {'),
    ('renpyAudio.stop = (channel) => {\n    let c = get_channel(channel);\n    c.queued = null;',
     'renpyAudio.stop = (channel) => {\n    let c = get_channel(channel);\n    knol_unschedule_queued(c);\n'
     '    c.knol_no_schedule = false;\n    c.queued = null;'),
    ('    if (c.queued && c.queued.tight && !even_tight) {\n        return;\n    }\n\n    c.queued = null;',
     '    if (c.queued && c.queued.tight && !even_tight) {\n        return;\n    }\n\n'
     '    knol_unschedule_queued(c);\n    c.queued = null;'),
    # A fading round ends early at silence; the next one starts the usual way, after it.
    ('renpyAudio.fadeout = (channel, delay) => {\n\n    let c = get_channel(channel);\n',
     'renpyAudio.fadeout = (channel, delay) => {\n\n    let c = get_channel(channel);\n'
     '    knol_unschedule_queued(c);\n    c.knol_no_schedule = true;\n'),
    # Once the booked round is sounding, report its position (the old round's `onended` may still be pending).
    ('renpyAudio.get_pos = (channel) => {\n\n    let c = get_channel(channel);\n    let p = c.playing;\n',
     'renpyAudio.get_pos = (channel) => {\n\n    let c = get_channel(channel);\n    let p = c.playing;\n\n'
     '    if (c.queued !== null && c.queued.knol_scheduled && context.currentTime >= c.queued.started) {\n'
     '        p = c.queued;\n    }\n'),
]


def patch_web_audio(source: str) -> str:
    digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f"Ren'Py _audio.js changed ({digest}); review spikes/renpy-web/web_audio.py for this SDK.")
    for anchor, replacement in EDITS:
        if source.count(anchor) != 1:
            raise SystemExit(f"Ren'Py _audio.js anchor not found exactly once: {anchor[:60]!r}")
        source = source.replace(anchor, replacement)
    return source


def write_web_audio(sdk: Path, game: Path) -> None:
    source = (sdk / 'renpy/common/_audio.js').read_bytes().decode('utf-8')
    (game / '_audio.js').write_text(patch_web_audio(source), encoding='utf-8')
