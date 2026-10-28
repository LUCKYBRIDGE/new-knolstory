"""Unit checks execute the actual Ren'Py presenter helpers with engine mocks."""
import pathlib
import textwrap
import types
import unittest
import tempfile
import hashlib
import base64
import sys
import copy

ROOT = pathlib.Path(__file__).resolve().parents[2]

class Music:
    def __init__(self):
        self.calls = []
        self.track = None
        self.tracks = {}
    def play(self, path, **kwargs):
        self.calls.append(('play', path, kwargs))
        self.tracks[kwargs.get('channel','music')] = path
        if kwargs.get('channel') == 'music': self.track = path
    def stop(self, **kwargs):
        self.calls.append(('stop', kwargs))
        self.tracks[kwargs.get('channel','music')] = None
        if kwargs.get('channel') == 'music': self.track = None
    def set_volume(self, volume, **kwargs): self.calls.append(('volume', volume, kwargs))
    def get_playing(self, channel='music'): return self.tracks.get(channel)
    def get_pos(self, channel='music'): return 1.25
    def register_channel(self, *args, **kwargs): pass

class Interface:
    def __init__(self):
        self.transitions = []
    def set_mode(self):
        pass

class Engine:
    def __init__(self, music):
        self.music = music
        self.transitions = []
        self.game = types.SimpleNamespace(interface=Interface())
    def transition(self, trans, **kwargs):
        self.transitions.append((trans, kwargs))

class PresenterTests(unittest.TestCase):
    def setUp(self):
        music = Music()
        engine = types.SimpleNamespace(music=music)
        source = (ROOT / 'renpy/responsive-spike/game/audio.rpy').read_text()
        self.ns = {'renpy': engine, 'time': types.SimpleNamespace(monotonic=lambda: 10)}
        exec(textwrap.dedent(source.split('init python:\n', 1)[1]), self.ns)
        self.ns['time'] = types.SimpleNamespace(monotonic=lambda: 10)
        self.music = music
    def apply(self, music, sounds=None, entrance=True, mode='play'):
        self.ns['knol_apply_audio']({'mode':mode,'audio':{'music':music,'sounds':sounds or []}}, entrance)
    def sequence(self, entry='visit-1'):
        return {'action':'sequence', 'id':'queue', 'entryId':entry, 'clips':[
            {'id':'one','audioPath':'assets/audio/one.wav','sourceStartMs':200,'sourceEndMs':1200,'volume':.4},
            {'id':'two','audioPath':'assets/audio/two.wav','sourceStartMs':500,'sourceEndMs':2500,'volume':.8}]}

    def test_two_sequence_channels_keep_independent_clocks_and_cancel_separately(self):
        music = self.sequence()
        ambience = self.sequence('ambient-visit')
        ambience['clips'][0]['sourceEndMs'] = 1700
        self.ns['knol_apply_audio']({'mode':'play','audio':{'music':music,'ambience':ambience}}, True)
        self.ns['knol_poll_audio'](False, 11.1)
        self.assertIn('two.wav', self.music.get_playing('music'))
        self.assertIn('one.wav', self.music.get_playing('knol_ambience'))
        self.ns['time'].monotonic = lambda: 11.2
        self.ns['knol_apply_audio']({'mode':'play','audio':{'music':{'action':'stop'},'ambience':ambience}}, True)
        self.assertIsNone(self.ns['knol_music_sequence'])
        self.assertEqual(self.ns['knol_ambience_sequence']['started'], 10)
        self.ns['knol_poll_audio'](False, 11.6)
        self.assertIsNone(self.music.get_playing('music'))
        self.assertIn('two.wav', self.music.get_playing('knol_ambience'))
        self.ns['knol_poll_audio'](False, 13.6)
        self.assertIsNone(self.music.get_playing('knol_ambience'))

    def test_sequence_boundaries_and_continuity_across_cut_entrances(self):
        cue = self.sequence()
        original = copy.deepcopy(cue)
        self.apply(cue)
        self.assertEqual(self.music.track, '<from 0.200 to 1.200>assets/audio/one.wav')
        self.ns['time'] = types.SimpleNamespace(monotonic=lambda: 10.6)
        self.apply(cue, entrance=True)
        self.apply({'action':'maintain'}, entrance=True)
        self.ns['knol_poll_audio'](False, 11)
        self.assertEqual(self.music.track, '<from 0.500 to 2.500>assets/audio/two.wav')
        self.ns['knol_poll_audio'](False, 13)
        self.assertIsNone(self.music.track)
        self.apply(cue)
        self.assertIsNone(self.music.track)
        self.assertEqual(self.ns['knol_music_start_count'], 2)
        self.assertEqual(cue, original)

    def test_sequence_late_poll_skips_expired_time_and_works_during_transition(self):
        self.apply(self.sequence())
        self.ns['knol_poll_audio'](True, 11.5)
        self.assertEqual(self.music.track, '<from 1.000 to 2.500>assets/audio/two.wav')
        self.ns['knol_poll_audio'](True, 14)
        self.assertIsNone(self.music.track)
        self.assertEqual(self.ns['knol_music_start_count'], 2)

    def test_sequence_stop_edit_session_entry_and_reconfiguration_cancel_old_schedule(self):
        for kind in ('stop','edit','session','entry','reconfigure','scalar'):
            with self.subTest(kind=kind):
                self.setUp()
                cue = self.sequence()
                self.apply(cue)
                self.ns['time'] = types.SimpleNamespace(monotonic=lambda: 10.5)
                if kind == 'stop': self.apply({'action':'stop'})
                elif kind == 'edit': self.apply(cue, mode='edit')
                elif kind == 'session': self.ns['knol_apply_audio']({'mode':'play','audio':{'sessionId':'new','music':cue}}, False)
                elif kind == 'entry': self.apply(self.sequence('visit-2'), entrance=False)
                elif kind == 'reconfigure': self.apply({**cue,'clips':[{**cue['clips'][0],'volume':.7},cue['clips'][1]]}, entrance=False)
                else: self.apply({'action':'play','audioPath':'assets/audio/scalar.wav'})
                self.ns['knol_poll_audio'](False, 11.1)
                if kind in ('stop','edit'): self.assertIsNone(self.music.track)
                elif kind == 'scalar': self.assertEqual(self.music.track, 'assets/audio/scalar.wav')
                else: self.assertEqual(self.music.track, '<from 0.200 to 1.200>assets/audio/one.wav')

    def test_sequence_fade_out_is_applied_once_before_clip_boundary(self):
        cue = self.sequence()
        cue['clips'][0]['fadeOutMs'] = 200
        self.apply(cue)
        self.ns['knol_poll_audio'](False, 10.8)
        self.ns['knol_poll_audio'](False, 10.9)
        fades = [c for c in self.music.calls if c[0]=='stop' and c[1].get('fadeout') == .2]
        self.assertEqual(len(fades), 1)
        self.ns['knol_poll_audio'](False, 11)
        self.assertEqual(self.music.track, '<from 0.500 to 2.500>assets/audio/two.wav')

    def test_sequence_unlock_uses_same_origin_as_presentation_and_sound(self):
        source = (ROOT / 'renpy/responsive-spike/game/script.rpy').read_text()
        functions = '    def knol_waiting_for_audio' + source.split('    def knol_waiting_for_audio', 1)[1].split('    def knol_body_render', 1)[0]
        exec(textwrap.dedent(functions), self.ns)
        ticks = iter([10.25, 10.75])
        self.ns.update(knol_audio_unlocked=False, knol_scene={'mode':'play','audio':{
            'music':self.sequence(),'sounds':[{'audioPath':'assets/audio/tap.wav'}]}},
            time=types.SimpleNamespace(monotonic=lambda: next(ticks)),
            knol_start_native_transition=lambda scene: None, knol_sync_effect_clocks=lambda scene, reset: None)
        self.ns['renpy'].restart_interaction = lambda: None
        self.assertTrue(self.ns['knol_waiting_for_audio']())
        self.ns['knol_unlock_audio']()
        self.assertEqual(self.ns['knol_music_sequence']['started'], 10.25)
        self.assertEqual(self.ns['knol_audio_started'], 10.25)
        self.assertEqual(self.ns['knol_presentation_started'], 10.25)
        self.ns['knol_poll_audio'](False, 11.25)
        self.assertEqual(self.music.track, '<from 0.500 to 2.500>assets/audio/two.wav')

    def test_sequence_future_service_clips_are_loaded_and_protected(self):
        source = (ROOT / 'renpy/responsive-spike/game/script.rpy').read_text()
        function = '    def knol_install_service_audio' + source.split('    def knol_install_service_audio', 1)[1].split('    def knol_install_audio', 1)[0]
        captured = []
        self.ns['knol_service_audio_cache'] = types.SimpleNamespace(install=lambda resources, paths, protected: captured.append((paths, protected)))
        exec(textwrap.dedent(function), self.ns)
        cue = self.sequence()
        for index, clip in enumerate(cue['clips']): clip['audioPath'] = 'assets/audio/cc0/track/v1/' + str(index) + '.ogg'
        self.apply(cue)
        self.ns['knol_install_service_audio']([], {'audio':{'music':cue}})
        expected = [clip['audioPath'] for clip in cue['clips']]
        self.assertEqual(captured[0][0], expected)
        for path in expected: self.assertIn(path, captured[0][1])
        self.apply({'action':'stop'})
        self.ns['knol_install_service_audio']([], {'audio':{'music':{'action':'stop'}}})
        self.assertEqual(captured[1], ([], []))

    def test_source_audio_range_is_non_destructive_and_identity_controls_restart(self):
        track = {'action':'play','audioPath':'assets/audio/rain.wav','sourceStartMs':100,'sourceEndMs':900,'loop':True}
        self.apply(track)
        self.assertEqual(self.music.track, '<from 0.100 to 0.900>assets/audio/rain.wav')
        self.assertEqual(self.ns['knol_audio_state']()['musicPath'], 'assets/audio/rain.wav')
        self.apply({**track,'volume':.5}, entrance=False)
        self.assertEqual(self.ns['knol_music_start_count'], 1)
        self.apply({**track,'sourceEndMs':1500}, entrance=False)
        self.assertEqual(self.ns['knol_music_start_count'], 2)
        self.assertEqual(self.music.track, '<from 0.100 to 1.500>assets/audio/rain.wav')
        self.assertEqual(self.ns['knol_audio_filename']({'audioPath':'assets/audio/plain.wav'}),'assets/audio/plain.wav')

    def test_sliced_playing_paths_remain_protected_during_service_cache_install(self):
        source = (ROOT / 'renpy/responsive-spike/game/script.rpy').read_text()
        function = '    def knol_install_service_audio' + source.split('    def knol_install_service_audio', 1)[1].split('    def knol_install_audio', 1)[0]
        captured = []
        self.ns['knol_service_audio_cache'] = types.SimpleNamespace(install=lambda resources, paths, protected: captured.append(protected))
        exec(textwrap.dedent(function), self.ns)
        path = 'assets/audio/cc0/test/v1/music.ogg'
        self.music.tracks['music'] = '<from 0.200 to 0.800>' + path
        self.ns['knol_install_service_audio']([], {'audio': {'music': {'action': 'stop'}}})
        self.assertIn(path, captured[0])
        self.assertNotIn('<from 0.200 to 0.800>' + path, captured[0])

    def test_ambience_independent_continuity_restore_and_edit(self):
        track={'action':'play','audioPath':'assets/audio/rain.wav','volume':.2,'loop':True}
        def apply(cue, session='one', mode='play'):
            self.ns['knol_apply_audio']({'mode':mode,'audio':{'sessionId':session,'music':{'action':'stop'},'ambience':cue,'sounds':[]}},False)
        apply(track)
        apply({**track,'volume':.4})
        self.assertEqual(len([c for c in self.music.calls if c[0]=='play' and c[2]['channel']=='knol_ambience']),1)
        self.assertEqual(self.ns['knol_audio_state']()['ambienceStartCount'],1)
        self.assertEqual(self.ns['knol_audio_state']()['ambiencePath'],'assets/audio/rain.wav')
        apply(track,'two')
        self.assertEqual(self.ns['knol_audio_state']()['ambienceStartCount'],2)
        apply({'action':'stop','fadeOutMs':300},'two')
        self.assertIsNone(self.ns['knol_ambience_identity'])
        self.assertIsNone(self.ns['knol_audio_state']()['ambiencePath'])
        apply(track,'two')
        apply(track,'two','edit')
        self.assertIsNone(self.ns['knol_ambience_identity'])
        self.assertTrue(any(c[0]=='stop' and c[1].get('channel')=='knol_ambience' for c in self.music.calls))
    def test_music_continues_across_cuts_and_volume_revisions(self):
        track = {'action':'play','audioPath':'assets/audio/music.wav','volume':.6,'loop':True}
        self.apply(track)
        self.apply({**track,'volume':.4})
        self.apply(track, entrance=False)
        self.assertEqual(len([c for c in self.music.calls if c[0]=='play']),1)
    def test_restart_session_resets_same_music(self):
        music={'action':'play','audioPath':'assets/audio/music.wav','volume':.6,'loop':True}
        for session in ['run-1','run-1','run-2']:
            self.ns['knol_apply_audio']({'mode':'play','audio':{'sessionId':session,'music':music,'sounds':[]}},True)
        self.assertEqual(len([c for c in self.music.calls if c[0]=='play']),2)
    def test_stop_and_edit_cancel_pending_sounds(self):
        self.apply({'action':'maintain'}, [{'id':'s','audioPath':'assets/audio/s.wav','volume':1,'delayMs':300}])
        self.assertEqual(len(self.ns['knol_audio_pending']),1)
        self.apply({'action':'stop','fadeOutMs':200}, mode='edit')
        self.assertEqual(self.ns['knol_audio_pending'],[])
        self.assertTrue(any(c[0]=='stop' for c in self.music.calls))
    def test_sound_once_and_delayed_from_actual_entrance(self):
        sound={'id':'s','audioPath':'assets/audio/s.wav','volume':.7,'delayMs':300}
        self.apply({'action':'maintain'},[sound])
        self.ns['knol_poll_audio'](False, 10.2)
        self.assertEqual(self.ns['knol_sound_play_count'],0)
        self.ns['knol_poll_audio'](False, 10.4)
        self.apply({'action':'maintain'},[sound],entrance=False)
        self.ns['knol_poll_audio'](False, 11)
        self.assertEqual(self.ns['knol_sound_play_count'],1)
    def test_transition_holds_sound_until_presentation_starts(self):
        self.apply({'action':'maintain'},[{'id':'s','audioPath':'assets/audio/s.wav','volume':1,'delayMs':0}])
        self.ns['knol_poll_audio'](True, 11)
        self.assertEqual(self.ns['knol_sound_play_count'],0)
        self.ns['knol_poll_audio'](False, 11)
        self.assertEqual(self.ns['knol_sound_play_count'],1)

class ResourceAndViewportTests(unittest.TestCase):
    def setUp(self):
        source = (ROOT / 'renpy/responsive-spike/game/script.rpy').read_text()
        self.resize_calls = []
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        game = ROOT / 'renpy/responsive-spike/game'
        prior_path = list(sys.path)
        sys.path.insert(0, str(game))
        self.addCleanup(lambda: sys.path.__setitem__(slice(None), prior_path))
        adjustment = lambda: types.SimpleNamespace(change=lambda value: None)
        self.ns = {'config': types.SimpleNamespace(screen_width=1280, screen_height=720, keymap={}, gamedir=self.directory.name),
            'renpy': types.SimpleNamespace(ui=types.SimpleNamespace(adjustment=adjustment), game=types.SimpleNamespace(interface=types.SimpleNamespace(set_mode=lambda: self.resize_calls.append(True))), free_memory=lambda:None)}
        # Execute only Python helpers; a separate native choice screen now precedes the stage.
        exec(textwrap.dedent(source.split('init python:\n',1)[1].split('\nscreen ',1)[0]), self.ns)
    def tap_setup(self, mode=None, page=0, can_back=True, ended=False):
        self.tap_calls = []
        self.ns.update(knol_ready=True, knol_audio_unlocked=True, knol_transition_active=False,
            knol_text_page=page, knol_scene={'sceneId':'tap', 'revision':5, 'mode':'play',
                'width':1280, 'height':720, 'readerCanGoBack':can_back, 'ended':ended})
        if mode is not None:
            self.ns['knol_scene']['readerTapMode'] = mode
        self.ns['knol_dialogue_metrics'] = lambda scene: {'pages':['first','last']}
        self.ns['knol_input'] = lambda kind, choice_id=None: self.tap_calls.append(kind)
        self.ns['knol_change_text_page'] = lambda offset: self.tap_calls.append(offset)
        self.ns['renpy'].get_mouse_pos = lambda: (100, 300)
    def test_default_stage_tap_advances_on_either_half(self):
        self.tap_setup()
        self.ns['knol_stage_tap']()
        self.ns['renpy'].get_mouse_pos = lambda: (1000, 300)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [1, 1])
    def test_halves_previous_page_precedes_host_back_and_absent_history_is_noop(self):
        self.tap_setup('halves', page=1, can_back=False)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1])
        self.ns['knol_text_page'] = 0
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1])
        self.ns['knol_scene']['readerCanGoBack'] = True
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1, 'backRequested'])
    def test_halves_right_advances_last_page_and_ended_left_can_return(self):
        self.tap_setup('halves', page=1)
        self.ns['renpy'].get_mouse_pos = lambda: (640, 300)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, ['advanceRequested'])
        self.ns['knol_scene']['ended'] = True
        self.ns['knol_stage_tap']()
        self.ns['renpy'].get_mouse_pos = lambda: (100, 300)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, ['advanceRequested', 'backRequested'])
    def test_choices_block_forward_but_allow_halves_back_without_selecting(self):
        self.tap_setup('halves', page=1)
        self.ns['knol_scene']['choices'] = [{'id':'a'}]
        self.ns['renpy'].get_mouse_pos = lambda: (1000, 300)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [])
        self.ns['renpy'].get_mouse_pos = lambda: (100, 300)
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1])
        self.ns['knol_text_page'] = 0
        self.ns['knol_dialogue_metrics'] = lambda scene: {'pages':['only']}
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1, 'backRequested'])
        self.ns['knol_scene']['readerTapMode'] = 'next'
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [-1, 'backRequested'])
        self.ns['knol_text_input']('choiceSelected', 'a')
        self.assertEqual(self.tap_calls[-1], 'choiceSelected')

    def test_stage_taps_respect_transition_audio_and_edit_gates(self):
        for gate in ('transition', 'audio', 'edit', 'unready', 'transitionOnly'):
            with self.subTest(gate=gate):
                self.tap_setup('halves', page=1)
                if gate == 'transition': self.ns['knol_transition_active'] = True
                if gate == 'audio':
                    self.ns['knol_audio_unlocked'] = False
                    self.ns['knol_scene']['audio'] = {'music':{'action':'play'}}
                if gate == 'edit': self.ns['knol_scene']['mode'] = 'edit'
                if gate == 'unready': self.ns['knol_ready'] = False
                if gate == 'transitionOnly': self.ns['knol_scene']['transitionOnly'] = True
                self.ns['knol_stage_tap']()
                self.assertEqual(self.tap_calls, [])

    def test_transition_only_cue_has_no_displayed_dialogue_or_extra_input(self):
        self.tap_setup(page=1)
        self.ns['knol_scene']['transitionOnly'] = True
        self.ns['knol_text_input']('advanceRequested')
        self.assertEqual(self.tap_calls, [])
        self.assertEqual(self.ns['knol_dialogue_page_evidence'](self.ns['knol_scene']),
            {'index':0, 'count':1, 'offset':0, 'endOffset':0})

    def test_pending_effect_waits_for_last_native_text_page_then_precedes_choices(self):
        self.tap_setup(page=0)
        self.ns['knol_scene'].update(effectSteps={'current':0, 'total':2}, choices=[{'id':'a'}])
        self.assertFalse(self.ns['knol_choices_visible']())
        self.ns['knol_text_input']('advanceRequested')
        self.assertEqual(self.tap_calls, [1])
        self.ns['knol_text_page'] = 1
        self.ns['knol_text_input']('choiceSelected', 'a')
        self.assertEqual(self.tap_calls, [1, 'advanceRequested'])
        self.assertFalse(self.ns['knol_choices_visible']())
        self.ns['knol_scene']['effectSteps']['current'] = 2
        self.assertTrue(self.ns['knol_choices_visible']())
        self.ns['knol_text_input']('advanceRequested')
        self.assertEqual(self.tap_calls, [1, 'advanceRequested'])
        self.ns['knol_text_input']('choiceSelected', 'a')
        self.assertEqual(self.tap_calls[-1], 'choiceSelected')

    def test_pending_effect_stage_tap_advances_even_with_choices(self):
        self.tap_setup(page=1)
        self.ns['knol_scene'].update(effectSteps={'current':1, 'total':2}, choices=[{'id':'a'}])
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, ['advanceRequested'])

    def test_pending_title_effect_requires_input_after_transition_completes(self):
        self.tap_setup(page=0)
        self.ns['knol_scene'].update(transitionOnly=True, effectSteps={'current':0, 'total':1})
        self.ns['knol_transition_active'] = True
        self.ns['knol_text_input']('advanceRequested')
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, [])
        self.ns['knol_transition_active'] = False
        self.ns['knol_stage_tap']()
        self.assertEqual(self.tap_calls, ['advanceRequested'])
        self.ns['knol_text_input']('advanceRequested')
        self.assertEqual(self.tap_calls, ['advanceRequested', 'advanceRequested'])
        self.ns['knol_scene']['effectSteps']['current'] = 1
        self.ns['knol_text_input']('advanceRequested')
        self.assertEqual(len(self.tap_calls), 3)

    def test_pending_title_input_passes_real_native_event_gate(self):
        self.tap_setup(page=0)
        self.ns['knol_scene'].update(transitionOnly=True, effectSteps={'current':0, 'total':1})
        source = (ROOT / 'renpy/responsive-spike/game/presentation.rpy').read_text()
        function = '    def knol_input' + source.split('    def knol_input', 1)[1].split('    def knol_finish_transition', 1)[0]
        exec(textwrap.dedent(function), self.ns)
        events = []
        self.ns['knol_revision'] = 5
        self.ns['knol_emit'] = events.append
        self.ns['knol_stage_tap']()
        self.assertEqual(events, [{'protocol':1, 'type':'advanceRequested', 'sceneId':'tap', 'revision':5}])
        self.ns['knol_input']('choiceSelected', 'a')
        self.assertEqual(len(events), 1)
        self.ns['knol_scene']['effectSteps']['current'] = 1
        self.ns['knol_stage_tap']()
        self.assertEqual(len(events), 2)
        self.assertEqual(events[-1]['type'], 'advanceRequested')
        self.ns['knol_scene'].update(readerTapMode='halves', readerCanGoBack=True)
        self.ns['knol_stage_tap']()
        self.assertEqual(events[-1]['type'], 'backRequested')
        self.assertEqual(len(events), 3)
        self.ns['knol_scene']['readerCanGoBack'] = False
        self.ns['knol_stage_tap']()
        self.assertEqual(len(events), 3)

    def test_title_shake_combines_screen_and_background_without_retargeting_actors(self):
        calls = []
        def shake(trans, st, at, kind):
            calls.append(kind)
            trans.xoffset, trans.yoffset = (3, 1) if kind == 'screen' else (-1, 2)
            return .016
        self.ns['knol_target_shake'] = shake
        trans = types.SimpleNamespace(xoffset=0, yoffset=0)
        self.assertEqual(self.ns['knol_title_shake'](trans, 0, 0), .016)
        self.assertEqual((trans.xoffset, trans.yoffset), (2, 3))
        self.assertEqual(calls, ['screen', 'background'])

    def test_pending_effect_preserves_audio_edit_and_ended_input_gates(self):
        for gate in ('audio', 'edit', 'ended', 'unready'):
            with self.subTest(gate=gate):
                self.tap_setup(page=1)
                self.ns['knol_scene']['effectSteps'] = {'current':0, 'total':1}
                if gate == 'audio':
                    self.ns['knol_audio_unlocked'] = False
                    self.ns['knol_scene']['audio'] = {'music':{'action':'play'}}
                if gate == 'edit': self.ns['knol_scene']['mode'] = 'edit'
                if gate == 'ended': self.ns['knol_scene']['ended'] = True
                if gate == 'unready': self.ns['knol_ready'] = False
                self.ns['knol_text_input']('advanceRequested')
                self.ns['knol_stage_tap']()
                self.assertEqual(self.tap_calls, [])

    def test_displayed_page_end_uses_actual_pages_not_resume_anchor(self):
        self.ns['knol_dialogue_metrics'] = lambda scene: {'pages':['첫🐇문', '나머지', '비밀']}
        self.ns['knol_text_page'] = 0
        self.ns['knol_text_offset'] = 2
        self.assertEqual(self.ns['knol_dialogue_page_evidence']({}), {'index':0,'count':3,'offset':2,'endOffset':3})
        self.ns['knol_text_page'] = 1
        self.assertEqual(self.ns['knol_dialogue_page_evidence']({})['endOffset'],6)

    def test_actual_audio_unlock_initializes_once_without_advancing_scene(self):
        scene = {'sceneId':'locked-cut', 'revision':4, 'mode':'play',
            'audio':{'music':{'action':'play'}, 'sounds':[]}}
        self.ns['knol_scene'] = scene
        before = copy.deepcopy(scene)
        calls = []
        self.ns['time'] = types.SimpleNamespace(monotonic=lambda: 10)
        self.ns['knol_apply_audio'] = lambda value, entrance, started=None: calls.append(('audio', copy.deepcopy(value), entrance))
        self.ns['knol_start_native_transition'] = lambda value: calls.append(('transition', copy.deepcopy(value)))
        self.ns['knol_sync_effect_clocks'] = lambda value, reset: calls.append(('clocks', copy.deepcopy(value), reset))
        self.ns['renpy'].restart_interaction = lambda: calls.append(('restart',))
        self.assertTrue(self.ns['knol_waiting_for_audio']())
        self.ns['knol_unlock_audio']()
        self.assertTrue(self.ns['knol_audio_unlocked'])
        self.assertFalse(self.ns['knol_waiting_for_audio']())
        self.assertTrue(self.ns['knol_pending'])
        self.assertEqual(self.ns['knol_presentation_started'], 10)
        self.assertEqual(self.ns['knol_audio_started'], 10)
        self.assertEqual([call[0] for call in calls], ['audio', 'transition', 'clocks', 'restart'])
        self.assertTrue(calls[0][2])
        self.assertTrue(calls[2][2])
        self.ns['time'] = types.SimpleNamespace(monotonic=lambda: 20)
        self.ns['knol_unlock_audio']()
        self.assertEqual(len(calls), 4)
        self.assertEqual(self.ns['knol_presentation_started'], 10)
        self.assertEqual(self.ns['knol_audio_started'], 10)
        self.assertIs(self.ns['knol_scene'], scene)
        self.assertEqual(scene, before)
        self.assertEqual(self.ns['knol_revision'], -1)
        self.assertEqual(self.ns['knol_seq'], -1)

    def test_ambience_only_sequence_requires_actual_audio_unlock(self):
        self.ns['knol_scene'] = {'mode':'play','audio':{'music':{'action':'stop'},
            'ambience':{'action':'sequence','id':'ambience','entryId':'visit','clips':[]}}}
        self.ns['knol_audio_unlocked'] = False
        self.assertTrue(self.ns['knol_waiting_for_audio']())
        self.ns['knol_audio_unlocked'] = True
        self.assertFalse(self.ns['knol_waiting_for_audio']())

    def test_orientation_updates_same_engine_only_when_dimensions_change(self):
        self.ns['knol_resize']({'width':720,'height':1558})
        self.ns['knol_resize']({'width':720,'height':1558})
        self.assertEqual(self.ns['config'].screen_height,1558)
        self.assertEqual(len(self.resize_calls),1)
    def test_custom_bytes_verified_before_native_file_install(self):
        data=b'native audio bytes'
        digest=hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            self.ns['config'].gamedir=directory
            resource={'id':'audio:custom:'+digest+':wav','data':base64.b64encode(data).decode()}
            self.ns['knol_install_audio']([resource])
            self.assertEqual((pathlib.Path(directory)/'assets/audio'/ (digest+'.wav')).read_bytes(),data)
            with self.assertRaises(ValueError):
                self.ns['knol_install_audio']([{**resource,'data':base64.b64encode(b'wrong').decode()}])
            with self.assertRaises(ValueError):
                self.ns['knol_install_audio']([{**resource,'id':'audio:custom:../../escape:wav'}])

class NativeDirectionTests(unittest.TestCase):
    def setUp(self):
        music = Music()
        engine = Engine(music)
        source = (ROOT / 'renpy/responsive-spike/game/presentation.rpy').read_text()
        self.ns = {'renpy': engine, 'time': types.SimpleNamespace(monotonic=lambda: 10),
            'Fade': lambda out, hold, inside, color='#000': ('Fade', round(out, 3), round(hold, 3), round(inside, 3), color),
            'Dissolve': lambda duration: ('Dissolve', round(duration, 3))}
        exec(textwrap.dedent(source.split('init python:\n', 1)[1].split('transform ', 1)[0]), self.ns)
        self.engine = engine
    def test_ended_scene_allows_only_host_back_input(self):
        events = []
        self.ns.update(knol_scene={'mode':'play','sceneId':'last','ended':True}, knol_revision=7,
            knol_transition_active=False, knol_waiting_for_audio=lambda:False, knol_emit=events.append)
        self.ns['knol_input']('advanceRequested')
        self.ns['knol_input']('backRequested')
        self.assertEqual(events, [{'protocol':1,'type':'backRequested','sceneId':'last','revision':7}])
        self.ns['knol_transition_active'] = True
        self.ns['knol_input']('backRequested')
        self.assertEqual(len(events), 1)
    def scene(self, transition, entry='entry-1', reduced=False):
        return {'mode':'play','sceneId':'s','presentationEntry':entry,'reducedMotion':reduced,
            'presentation':{'transition':transition},'audio':{'music':{'action':'stop'},'sounds':[]}}
    def test_auto_fade_and_dissolve_use_native_transition_once_per_entry(self):
        scene = self.scene({'type':'fade-black','durationMs':900,'mode':'auto'})
        self.assertTrue(self.ns['knol_should_use_native_transition'](scene))
        self.ns['knol_start_native_transition'](scene)
        self.ns['knol_start_native_transition'](scene)
        self.assertEqual(self.engine.transitions, [(('Fade', .36, 0.09, .45, '#080b12'), {'layer':'screens','always':True,'force':True})])
        self.ns['knol_start_native_transition'](self.scene({'type':'dissolve','durationMs':500,'mode':'auto'}, 'entry-2'))
        self.assertEqual(self.engine.transitions[-1], (('Dissolve', .5), {'layer':'screens','always':True,'force':True}))
    def test_confirm_and_perspective_remain_overlay_transitions(self):
        self.assertFalse(self.ns['knol_should_use_native_transition'](self.scene({'type':'fade-black','durationMs':900,'mode':'confirm'})))
        self.assertFalse(self.ns['knol_should_use_native_transition'](self.scene({'type':'perspective-blackout','durationMs':900,'mode':'auto'})))
    def test_atl_motion_keeps_authored_delay_before_interpolation(self):
        scene = self.scene(None)
        self.ns['knol_transition_active']=False
        self.ns['knol_waiting_for_audio']=lambda value:False
        self.ns['knol_presentation_started'] = self.ns['time'].monotonic()
        actor = {'id':'actor', 'motion':{'type':'move','durationMs':800,'delayMs':500,'offsetX':100}}
        state = self.ns['knol_actor_motion_state'](actor,scene)
        self.assertGreater(state.get('wait',0),.45)
        self.assertEqual(state['start_xoffset'],100)
        self.assertAlmostEqual(state['remaining'],.8,places=2)

    def setup_effects(self, effects, reduced=False):
        self.now = 10
        self.ns['time'] = types.SimpleNamespace(monotonic=lambda: self.now)
        self.ns['knol_scene'] = {'mode':'play','reducedMotion':reduced,'presentation':{'effects':effects}}
        self.ns['knol_presentation_started'] = 10
        self.ns['knol_transition_active'] = False
        self.ns['knol_waiting_for_audio'] = lambda *args:False
        self.ns['knol_sync_effect_clocks'](self.ns['knol_scene'], True)

    def test_effect_duration_extends_shake_and_ends_overlay(self):
        effect = {'type':'shake','durationMs':2000,'originEntry':'a'}
        self.setup_effects([effect])
        self.now = 11.1
        trans = types.SimpleNamespace(xoffset=0,yoffset=0,alpha=0)
        self.ns['knol_target_shake'](trans, 0, 0)
        self.assertNotEqual(trans.xoffset,0)
        self.now = 12.1
        self.ns['knol_target_shake'](trans, 0, 0)
        self.assertEqual(trans.xoffset,0)
        overlay = {'type':'flash-red','durationMs':2000,'originEntry':'a'}
        self.now = 11.1
        self.ns['knol_effect_alpha'](trans,0,0,overlay)
        self.assertGreater(trans.alpha,0)
        self.now = 12.1
        self.ns['knol_effect_alpha'](trans,0,0,overlay)
        self.assertEqual(trans.alpha,0)

    def test_effect_zero_duration_and_reduced_motion_loop(self):
        self.setup_effects([])
        trans=types.SimpleNamespace(alpha=1)
        self.ns['knol_effect_alpha'](trans,0,0,{'type':'flash','durationMs':0})
        self.assertEqual(trans.alpha,0)
        self.setup_effects([{'type':'crack','durationMs':700,'repeat':'loop','periodMs':1000}],reduced=True)
        self.now=12.2
        self.ns['knol_effect_alpha'](trans,0,0,self.ns['knol_scene']['presentation']['effects'][0])
        self.assertEqual(trans.alpha,0)

    def test_explicit_delay_and_loop_duration_preserve_same_entry_clock(self):
        effect={'type':'flash-red','durationMs':400,'delayMs':500,'repeat':'loop','periodMs':1000,'originEntry':'a'}
        self.setup_effects([effect])
        trans=types.SimpleNamespace(alpha=0)
        self.now=10.3
        self.ns['knol_effect_alpha'](trans,0,0,effect)
        self.assertEqual(trans.alpha,0)
        self.now=10.7
        self.ns['knol_effect_alpha'](trans,0,0,effect)
        self.assertGreater(trans.alpha,0)
        self.ns['knol_sync_effect_clocks'](self.ns['knol_scene'])
        self.now=11.1
        self.ns['knol_effect_alpha'](trans,0,0,effect)
        self.assertEqual(trans.alpha,0)
        self.now=11.7
        self.ns['knol_effect_alpha'](trans,0,0,effect)
        self.assertGreater(trans.alpha,0)

    def test_transition_finish_preserves_inherited_clock_and_starts_new_cue(self):
        self.setup_effects([])
        self.ns['knol_effect_clocks']={'following':9,'current':10}
        self.ns['knol_revision']=1
        self.ns['knol_scene']['sceneId']='current'
        self.ns['knol_emit']=lambda event:None
        self.ns['renpy'].restart_interaction=lambda:None
        self.now=11
        self.ns['knol_finish_transition']()
        self.assertEqual(self.ns['knol_effect_clocks'],{'following':9,'current':11})

    def test_title_completion_reports_only_presentation_done_with_pending_effects(self):
        self.setup_effects([])
        self.ns['knol_scene'].update(sceneId='title', transitionOnly=True, effectSteps={'current':0, 'total':1})
        self.ns['knol_transition_active'] = True
        self.ns['knol_revision'] = 5
        events = []
        self.ns['knol_emit'] = events.append
        self.ns['renpy'].restart_interaction = lambda: None
        self.ns['knol_finish_transition']()
        self.assertEqual([event['type'] for event in events], ['presentationDone'])
        self.assertFalse(self.ns['knol_transition_active'])
        self.assertEqual(self.ns['knol_scene']['effectSteps'], {'current':0, 'total':1})

    def test_default_durations_preserve_old_cues(self):
        self.assertEqual(self.ns['knol_effect_duration']({'type':'shake'}),.6)
        self.assertEqual(self.ns['knol_effect_duration']({'type':'crack'}),1.8)
        self.assertEqual(self.ns['knol_effect_duration']({'type':'spotlight'}),.8)

    def test_actor_atl_includes_authored_pause(self):
        source=(ROOT/'renpy/responsive-spike/game/presentation.rpy').read_text()
        atl=source.split('transform knol_actor_motion_atl(actor, scene):',1)[1]
        self.assertLess(atl.index('pause knol_actor_motion_value(actor, scene, "wait")'), atl.index('linear knol_actor_motion_value'))

    def test_reduced_native_transition_keeps_short_clock(self):
        self.ns['knol_start_native_transition'](self.scene({'type':'white-fade','durationMs':900,'mode':'auto'}, reduced=True))
        self.assertEqual(self.engine.transitions[0][0], ('Fade', .04, .01, .05, '#ffffff'))

if __name__ == '__main__': unittest.main()
