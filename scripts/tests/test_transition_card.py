"""Measure the actual presenter helper without introducing another renderer."""
import re
import textwrap
import unittest
from pathlib import Path
SOURCE = Path(__file__).resolve().parents[2] / 'renpy/responsive-spike/game/presentation.rpy'
class TransitionCardTests(unittest.TestCase):
    def helper(self):
        match = re.search(r'    def knol_transition_card_layout\(.*?(?=    def knol_)', SOURCE.read_text(), re.S)
        self.assertIsNotNone(match, 'native transition card layout is shared and measurable')
        class Native:
            def render(self, text, width, height, st, at):
                value, style = text
                rows = sum(max(1, (len(line)*style['size']//2 + width-1)//width) for line in value.split('\n'))
                return type('Render', (), {'height': rows*(style['size']+8)})()
        context = {'Text':lambda value, **style:(value,style), 'renpy':Native(), 'knol_literal':lambda value:value}
        exec(textwrap.dedent(match.group()), context)
        return context['knol_transition_card_layout']
    def test_short_title_is_centered_in_landscape_and_portrait(self):
        layout = self.helper()
        for w,h in [(1280,720),(720,1280)]:
            box=layout({'width':w,'height':h,'presentation':{'transition':{'type':'perspective-blackout','title':'부인의 시점'}}})
            self.assertAlmostEqual(box['y']+box['height']/2,h/2,delta=1)
            self.assertGreater(box['titleSize'],box['bodySize'])
            self.assertLess(box['height'],h*.3)
    def test_long_authored_copy_scrolls_above_confirmation(self):
        box=self.helper()({'width':720,'height':1280,'presentation':{'transition':{'mode':'confirm','title':'긴 제목 '*80,'description':'설명 '*1000}}})
        self.assertLessEqual(box['y']+box['height'],box['buttonY']-24)
        self.assertGreater(box['height'],0)
    def test_reduced_motion_shows_title_without_fade(self):
        code=re.search(r'    def knol_card_text_fade\(.*?(?=    def knol_)',SOURCE.read_text(),re.S).group()
        class Clock:
            def monotonic(self):return .14
        context={'time':Clock(),'knol_presentation_started':0,'knol_scene':{'reducedMotion':True}}
        exec(textwrap.dedent(code),context)
        transform=type('Transform',(),{})()
        context['knol_card_text_fade'](transform,0,0)
        self.assertEqual(transform.alpha,1)
        context['knol_scene']['reducedMotion']=False
        context['knol_card_text_fade'](transform,0,0)
        self.assertAlmostEqual(transform.alpha,.5)
if __name__=='__main__':unittest.main()
