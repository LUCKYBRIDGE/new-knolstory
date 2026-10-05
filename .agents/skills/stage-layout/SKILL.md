# Stage Layout Skill

Runtime Core owns canonical layout math.
Ren'Py and HTML editing overlay consume the same resolved coordinate system and transform.
Do not create a second placement algorithm in Ren'Py.
Test multi-actor, resize, DPR, overlap and legacy xAnchor behavior.
