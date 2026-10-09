#!/usr/bin/env python3
"""Reproducible, sample-free score palette. Requires numpy and ffmpeg."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

RATE = 44100
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'apps/web/public/assets/audio/story-score'


def lowpass(signal, cutoff):
    frequencies = np.fft.rfftfreq(len(signal), 1 / RATE)
    return np.fft.irfft(np.fft.rfft(signal) / (1 + (frequencies / cutoff) ** 6), n=len(signal))


def colored_noise(rng, n, cutoff=1500, low=40):
    frequencies = np.fft.rfftfreq(n, 1 / RATE)
    spectrum = np.fft.rfft(rng.normal(size=n))
    shape = 1 / np.sqrt(np.maximum(frequencies, low))
    shape *= 1 / (1 + (frequencies / cutoff) ** 4)
    shape[frequencies < low] = 0
    noise = np.fft.irfft(spectrum * shape, n=n)
    return noise / max(np.std(noise), 1e-9)


def tone(midi, duration, voice='pluck'):
    t = np.arange(round(duration * RATE)) / RATE
    f = 440 * 2 ** ((midi - 69) / 12)
    if voice == 'pluck':
        signal = sum(np.sin(2 * np.pi * f * harmonic * t) * np.exp(-t * (1.1 + harmonic * .65)) / harmonic ** 1.7 for harmonic in range(1, 9))
        envelope = np.minimum(t / .012, 1) * np.minimum((duration - t) / .15, 1)
    elif voice == 'reed':
        vibrato = 2 * np.pi * f * t + .09 * np.sin(2 * np.pi * 4.4 * t)
        signal = np.sin(vibrato) + .12 * np.sin(2 * vibrato) + .045 * np.sin(3 * vibrato)
        envelope = np.minimum(t / .16, 1) * np.minimum((duration - t) / .35, 1)
    elif voice == 'bell':
        signal = sum(np.sin(2 * np.pi * f * harmonic * t) * np.exp(-t * (1 + harmonic * .24)) / harmonic ** 1.7 for harmonic in (1, 2, 3.01, 4.17))
        envelope = np.minimum(t / .008, 1) * np.minimum((duration - t) / .2, 1)
    else:
        signal = sum(np.sin(2 * np.pi * f * harmonic * t + .025 * np.sin(2 * np.pi * (.23 + harmonic * .03) * t)) / harmonic ** 2.5 for harmonic in range(1, 6))
        envelope = np.minimum(t / .7, 1) * np.minimum((duration - t) / .8, 1)
    return signal * np.clip(envelope, 0, 1)


def add(signal, event, start, gain=.1, pan=0, circular=False):
    offset = round(start * RATE)
    positions = np.arange(len(event)) + offset
    if circular:
        positions %= len(signal)
    else:
        valid = (positions >= 0) & (positions < len(signal))
        positions, event = positions[valid], event[valid]
    left = math.sqrt((1 - pan) / 2)
    right = math.sqrt((1 + pan) / 2)
    np.add.at(signal[:, 0], positions, event * gain * left)
    np.add.at(signal[:, 1], positions, event * gain * right)


def space(signal, circular):
    result = signal.copy()
    for delay, gain in ((.071, .1), (.137, .085), (.239, .065), (.391, .05), (.617, .035)):
        shift = round(delay * RATE)
        reflection = np.roll(signal[:, ::-1], shift, axis=0)
        if not circular:
            reflection[:shift] = 0
        result += reflection * gain
    return result


SCORES = [
    ('score-calm', '계곡의 평온', [50, 55, 57, 50], [0, 7, 9, 4, 2, 7, 4, 0], 'major', 'reed'),
    ('score-curiosity', '작은 발견', [55, 60, 57, 62], [7, 9, 12, 7, 4, 9, 2, 7], 'major', 'pluck'),
    ('score-tension', '다가오는 위기', [50, 48, 46, 45], [0, 2, 3, 7, 5, 3, 2, -1], 'minor', 'reed'),
    ('score-loss', '남겨진 마음', [57, 53, 48, 52], [7, 3, 2, 0, 7, 5, 3, 2], 'minor', 'reed'),
    ('score-warmth', '함께하는 온기', [53, 58, 60, 53], [4, 7, 9, 7, 2, 4, 0, 2], 'major', 'reed'),
    ('score-mystery', '기이한 징조', [50, 53, 48, 45], [0, 7, 12, 3, 2, 10, 7, 2], 'minor', 'bell'),
    ('score-ocean', '깊은 물의 길', [48, 53, 46, 48], [7, 10, 12, 7, 5, 3, 2, 0], 'minor', 'reed'),
    ('score-resolve', '새로운 아침', [55, 60, 62, 55], [0, 4, 7, 9, 12, 9, 7, 4], 'major', 'pluck'),
]


def score(roots, motif, mode, lead):
    length = 32
    signal = np.zeros((RATE * length, 2))
    third = 4 if mode == 'major' else 3
    for bar in range(8):
        root = roots[bar % 4]
        start = bar * 4
        for note in (root - 12, root, root + third, root + 7):
            add(signal, tone(note, 4.9, 'pad'), start, .048, -.28 if note % 2 else .28, True)
        for beat, interval in enumerate((0, 7, third, 7)):
            add(signal, tone(root + interval + 12, 2.4), start + beat + .03, .058, (-1) ** beat * .32, True)
        # A composed two-phrase motif: sparse, with a varied answer on the second cycle.
        for beat in (0, 2):
            interval = motif[bar] + (0 if beat == 0 else (-2 if bar % 2 else 2))
            if bar >= 4 and beat == 2:
                interval -= 2
            add(signal, tone(roots[0] + 12 + interval, 1.8, lead), start + beat + .12, .105, .1, True)
    return space(signal, True)


def ambient(kind, rng):
    duration = 24
    n = duration * RATE
    n += (-n) % 64
    t = np.arange(n) / RATE
    periodic_t = t * (duration * RATE / n)
    signal = np.zeros((n, 2))
    for channel in range(2):
        if kind == 'stream':
            noise = colored_noise(rng, n, 4600, 140)
            wavelet = .8 + .14 * np.sin(2 * np.pi * periodic_t / 6) + .07 * np.sin(2 * np.pi * periodic_t / 3)
        elif kind == 'rain':
            noise = colored_noise(rng, n, 7600, 260)
            wavelet = .85 + .09 * np.sin(2 * np.pi * periodic_t / 12)
        elif kind == 'ocean':
            noise = colored_noise(rng, n, 2400, 55)
            wavelet = .25 + .7 * (.5 - .5 * np.cos(2 * np.pi * periodic_t / 8)) ** 1.3
        else:
            noise = colored_noise(rng, n, 1100, 130)
            wavelet = .5 + .2 * np.sin(2 * np.pi * periodic_t / 12)
        signal[:, channel] = noise * wavelet * .075
    if kind == 'forest':
        for start in (2, 7, 14, 20):
            add(signal, chirp(.5, 1900, 2600), start, .065, float(rng.uniform(-.65, .65)), True)
    if kind == 'stream':
        for start in np.arange(.1, duration, .43):
            add(signal, chirp(.08, 600, 320), start, .014, float(rng.uniform(-.7, .7)), True)
    return signal


def chirp(duration, first, last):
    t = np.arange(round(duration * RATE)) / RATE
    phase = 2 * np.pi * (first * t + (last - first) * t * t / (2 * duration))
    return np.sin(phase) * np.sin(np.pi * t / duration) ** 2


SOUNDS = [
    ('thunder', '멀리서 울리는 천둥', 5), ('door', '나무 문 여닫기', 1.8),
    ('cloth', '옷자락 움직임', 1.2), ('steps', '흙길 발걸음', 2.4),
    ('bird', '새의 짧은 울음', 1.5), ('swallow', '제비의 재잘거림', 1.8),
    ('gourd', '박을 두드리기', 1.3), ('crack', '박이 갈라지는 순간', 1.4),
    ('water', '물에 들어가는 순간', 2), ('sting', '놀라운 발견', 2.4),
]


def sound(kind, duration, rng):
    n = round(duration * RATE)
    t = np.arange(n) / RATE
    result = np.zeros((n, 2))
    if kind == 'thunder':
        noise = colored_noise(rng, n, 650, 25)
        envelope = np.minimum(t / .08, 1) * np.exp(-t / 1.3) * (1 + .25 * np.sin(t * 17))
        add(result, noise * envelope, 0, .25)
    elif kind in ('bird', 'swallow'):
        sequence = ((.1, .19), (.38, .12), (.62, .22)) if kind == 'bird' else ((.1, .08), (.26, .09), (.45, .12), (.68, .09), (.88, .13))
        for offset, length in sequence:
            add(result, chirp(length, 1900, 3100 if kind == 'bird' else 3600), offset, .2, .15)
    elif kind == 'gourd':
        # Hollow woody cavity: inharmonic resonances and a brief contact transient.
        # This is a stylized gourd tap, not a low musical note or field recording.
        nt = np.arange(round(.58 * RATE)) / RATE
        resonator = sum(np.sin(2 * np.pi * freq * nt) * np.exp(-nt / decay) * gain for freq, decay, gain in ((230, .085, 1), (371, .052, .65), (613, .036, .36), (947, .02, .12)))
        contact = colored_noise(rng, len(nt), 3400, 220) * np.exp(-nt / .009) * .24
        event = (resonator + contact) * np.minimum(nt / .0015, 1)
        for offset, gain in ((.05, .3), (.38, .25)):
            add(result, event, offset, gain)
    elif kind == 'door':
        # Quiet friction during movement, then a hollow latch/wood contact.
        nt = np.arange(round(.8 * RATE)) / RATE
        phase = 2 * np.pi * (155 * nt - 42 * nt * nt + 1.2 * np.sin(2 * np.pi * 2.1 * nt))
        creak = sum(np.sin(harmonic * phase) / harmonic ** 1.8 for harmonic in range(1, 7))
        friction = colored_noise(rng, len(nt), 1900, 350) * .2
        envelope = np.sin(np.pi * nt / .8) ** 2 * (.7 + .3 * np.sin(2 * np.pi * 5 * nt) ** 2)
        add(result, (creak + friction) * envelope, .08, .07, -.1)
        kt = np.arange(round(.55 * RATE)) / RATE
        knock = sum(np.sin(2 * np.pi * freq * kt) * np.exp(-kt / decay) * gain for freq, decay, gain in ((95, .07, .7), (226, .045, .5), (457, .018, .22)))
        knock += colored_noise(rng, len(kt), 2100, 140) * np.exp(-kt / .013) * .24
        add(result, knock * np.minimum(kt / .003, 1), .94, .24, .1)
    elif kind == 'sting':
        for offset, note in ((.05, 57), (.18, 64), (.31, 69)):
            add(result, tone(note, 1, 'bell'), offset, .3)
    else:
        cutoff = {'door': 1300, 'cloth': 3100, 'steps': 800, 'crack': 5000, 'water': 5300}[kind]
        events = (.1, .65, 1.2, 1.75) if kind == 'steps' else ((.08, .85) if kind == 'door' else (.08,))
        for offset in events:
            length = .42 if kind == 'steps' else min(duration - offset - .1, .85)
            nt = np.arange(round(length * RATE)) / RATE
            noise = colored_noise(rng, len(nt), cutoff, 80)
            envelope = np.minimum(nt / .012, 1) * np.exp(-nt / (.065 if kind in ('steps', 'crack') else .22))
            if kind == 'cloth':
                envelope = np.sin(np.pi * nt / length) ** 2
            event = noise * envelope
            if kind in ('door', 'steps', 'crack'):
                event += .6 * np.sin(2 * np.pi * (95 if kind == 'door' else 135) * nt) * np.exp(-nt / .08)
            add(result, event, offset, .22, -.1 if offset < .5 else .1)
    return space(result, False)


def write_asset(directory, asset_id, name, kind, signal, loop, seed, method):
    # Native Vorbis emits whole 64-frame blocks. Preserve a periodic tail for loops.
    padding = (-len(signal)) % 64
    if padding:
        signal = np.concatenate((signal, signal[:padding] if loop else np.zeros((padding, 2))))
    signal -= np.mean(signal, axis=0)
    peak = float(np.max(np.abs(signal)))
    # Maintain a shared quiet listening range, with headroom for runtime mixing.
    target_rms = .08 if kind == 'music' else (.065 if loop else .095)
    signal *= min(target_rms / max(float(np.sqrt(np.mean(signal ** 2))), 1e-9), .66 / max(peak, 1e-9))
    if not loop:
        ramp = min(round(.02 * RATE), len(signal) // 2)
        signal[:ramp] *= np.linspace(0, 1, ramp)[:, None]
        signal[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
    pcm = np.round(signal * 32767).astype('<i2')
    with tempfile.TemporaryDirectory() as temp:
        master = Path(temp) / 'master.wav'
        with wave.open(str(master), 'wb') as wav:
            wav.setnchannels(2)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(pcm.tobytes())
        path = directory / f'{asset_id}.ogg'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(master), '-c:a', 'vorbis', '-strict', '-2', '-q:a', '4', str(path)], check=True)
    data = path.read_bytes()
    return {'id': asset_id, 'name': name, 'kind': kind, 'file': path.name, 'durationSeconds': len(signal) / RATE, 'loop': loop, 'sampleRate': RATE, 'channels': 2, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'peakDbfsMaster': round(20 * math.log10(max(np.max(np.abs(signal)), 1e-12)), 2), 'rmsDbfsMaster': round(20 * math.log10(max(np.sqrt(np.mean(signal ** 2)), 1e-12)), 2), 'loopBoundaryStepMaster': float(np.max(np.abs(signal[0] - signal[-1]))) if loop else None, 'seed': seed, 'source': 'Original procedural synthesis; no third-party samples or copied composition', 'method': method, 'rights': 'CC0-1.0', 'qualityStatus': 'candidate; numeric validation is not human listening approval'}


def validate_assets(directory, assets):
    checks = []
    for asset in assets:
        decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(directory / asset['file']), '-f', 'f32le', '-ac', '2', '-ar', str(RATE), 'pipe:1'], capture_output=True, check=True).stdout
        signal = np.frombuffer(decoded, dtype='<f4').reshape(-1, 2)
        step = float(np.max(np.abs(signal[0] - signal[-1])))
        adjacent = float(np.percentile(np.max(np.abs(np.diff(signal, axis=0)), axis=1), 99.9))
        checks.append({'id': asset['id'], 'decodedFrames': len(signal), 'expectedFrames': round(asset['durationSeconds'] * RATE), 'sampleCountPass': len(signal) == round(asset['durationSeconds'] * RATE), 'finite': bool(np.isfinite(signal).all()), 'peakDbfs': round(float(20 * np.log10(max(np.abs(signal).max(), 1e-12))), 2), 'loopBoundaryStep': round(step, 6) if asset['loop'] else None, 'loopSeamComparedWithAdjacent99_9Percentile': round(step / max(adjacent, 1e-12), 3) if asset['loop'] else None})
    (directory / 'validation.json').write_text(json.dumps({'scope': 'Actual decoded Ogg delivery; numerical checks, not listening approval', 'checks': checks}, indent=2) + '\n')
    if not all(check['sampleCountPass'] and check['finite'] and check['peakDbfs'] < -1 and (check['loopSeamComparedWithAdjacent99_9Percentile'] is None or check['loopSeamComparedWithAdjacent99_9Percentile'] < 1) for check in checks):
        raise RuntimeError('Decoded audio failed frame/headroom/loop boundary validation')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    assets = []
    for asset_id, name, roots, motif, mode, lead in SCORES:
        assets.append(write_asset(args.output, asset_id, name, 'music', score(roots, motif, mode, lead), True, 0, 'Original eight-bar 60 BPM phrase; additive pad, plucked accompaniment and sparse melody; circular tails'))
    for index, kind in enumerate(('stream', 'rain', 'forest', 'ocean')):
        seed = 7100 + index
        assets.append(write_asset(args.output, f'ambience-{kind}', {'stream': '계곡 물소리', 'rain': '잔잔한 비', 'forest': '숲의 바람과 새', 'ocean': '바다의 파도'}[kind], 'ambience', ambient(kind, np.random.default_rng(seed)), True, seed, 'Synthetic approximation, not a field recording; periodic filtered noise spectrum and integer-period modulation'))
    for index, (kind, name, duration) in enumerate(SOUNDS):
        seed = 7200 + index
        assets.append(write_asset(args.output, f'sfx-{kind}', name, 'sfx', sound(kind, duration, np.random.default_rng(seed)), False, seed, 'Original filtered-noise and additive-resonator gesture; synthetic approximation'))
    manifest = {'schemaVersion': 1, 'generator': 'scripts/create-story-soundtrack.py', 'license': 'CC0-1.0', 'thirdPartyAudioSamples': False, 'assets': assets}
    (args.output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    validate_assets(args.output, assets)
    print(json.dumps({'assets': len(assets), 'totalBytes': sum(a['bytes'] for a in assets), 'maxMasterPeakDbfs': max(a['peakDbfsMaster'] for a in assets)}, indent=2))


if __name__ == '__main__':
    main()
