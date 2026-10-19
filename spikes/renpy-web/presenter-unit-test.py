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
        exec(textwrap.dedent(source.split('init python:\n',1)[1].split('screen knol_stage():',1)[0]), self.ns)
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
        self.ns['knol_apply_audio'] = lambda value, entrance: calls.append(('audio', copy.deepcopy(value), entrance))
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
