# Existing tale score palette

This candidate palette is made for the existing fairy/woodcutter, Heungbu/Nolbu,
Onggojip and rabbit/turtle stories. It is not a new story or a replacement script.
No audio recording, downloaded sample, copied tune or paid generation API is used.

## Rights and source

The generated audio files in this directory are dedicated to the public domain
under **CC0 1.0 Universal**. They may be played, edited, bundled in the editor and
included as audio attachments in `.knolstory` exports without a credit requirement.
The original note sequences, synthesized waveforms and noise gestures are defined
in `scripts/create-story-soundtrack.py`; there are no third-party audio inputs.
CC0 legal text: <https://creativecommons.org/publicdomain/zero/1.0/legalcode>.
The audio dedication does not change the repository's source-code license.

Natural and everyday sounds here are **synthetic approximations**, not field
recordings. In particular rain, stream, forest, sea, footsteps, door and bird calls
should not be described as authentic recordings or specific Korean instruments.
The timbres suggest soft reeds, plucked strings and sustained harmonic layers;
they are not samples of a daegeum or gayageum.

## Palette and direction

- `score-calm`: gentle valley/opening, restrained ascending and returning phrase.
- `score-curiosity`: small discoveries and comic investigation, light plucks.
- `score-tension`: approaching danger, lower minor-root movement and sparse reed.
- `score-loss`: separation/regret, slower perceived phrase and soft minor harmony.
- `score-warmth`: generosity, reunion and trust, rounded major harmony.
- `score-mystery`: double/identity, transformation and uncanny signs, bell accents.
- `score-ocean`: turtle/rabbit water-world travel, minor harmony and gentle motion.
- `score-resolve`: resolution, new morning and recovered agency, brighter plucks.
- Four approximately 24-second ambient loops: stream, rain, forest wind/birds, ocean wash.
- Ten event sounds: thunder, door, cloth, soil footsteps, bird, swallow, gourd tap,
  gourd crack, water entry and discovery sting.

Music cues are original 8-bar, 60 BPM, 32-second phrases. Four-bar harmonic motion
is answered by a second melodic phrase. Layers have different envelopes and modest
stereo positions; all reflection/tail placement wraps around the period. There is
no global fade at loop boundaries. Ambient spectra are periodic FFT noise with
integer-period modulation. One-shot effects have onset/end ramps and finite tails.

The approximate ambience remains quieter than music; runtime mixing should keep
both below readable dialogue. Silence is an intentional editorial choice. Do not
assign effects to every line, and do not replay one-shot sounds on a text edit,
viewport resize or preference change.

## Reproduce

From repository root, with Python 3 + NumPy and ffmpeg installed:

```sh
python3 scripts/create-story-soundtrack.py
```

An optional `--output DIRECTORY` writes elsewhere for audition/revision. The script
rounds durations up by less than 64 frames (1.46 ms) to avoid codec padding and
creates 44.1 kHz stereo PCM masters in temporary storage, measures them, then encodes
Ogg Vorbis (`vorbis -strict -2 -q:a 4`) and removes temporary WAV files. It requires
no network. Seeds and score notes are fixed. Signal generation is reproducible;
encoded bytes/hashes may vary with ffmpeg/NumPy versions. The output manifest is
regenerated from actual bytes and includes sample duration, hashes, level measures,
source method and candidate status. Master level measures are from PCM;
decoded delivery checks are in `validation.json`.

## Quality limits

These are **candidate assets**, not proof of professional mastering or human
listening approval. Checks establish successful decoding, expected sample counts,
headroom and boundary behavior. They cannot prove taste, musical suitability or
realistic acoustic sound. Audition the complete cues in the actual Ren'Py mix;
revise intrusive/repetitive cues and replace an approximation if it does not convey
the intended event. Actual speaker/headphone and hardware listening are separate
from numeric/browser playback checks.

## Source and mix review

`sonic-review.json` records decoded RMS, frequency-band proportions and predicted
levels at the chapter overlay's music/ambience/effect gains. These levels describe
digital signals, not sound-pressure levels or physical audibility. The shared
60 BPM arrangement can be repetitive during long scenes. The revised gourd cue uses hollow-body resonances, and the door cue adds
quiet friction/creak before wood contact. These remain stylized synthetic cues; birds are high-frequency sweeps. Those cues need
recognizability and restraint checks during actual story playback. Use the review's
six art-direction criteria to compare before/after and to reject an inappropriate
cue even when its numeric validation passes.
