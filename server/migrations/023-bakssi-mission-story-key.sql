ALTER TABLE knolstory_class.missions
 DROP CONSTRAINT missions_story_key_check,
 ADD CONSTRAINT missions_story_key_check
 CHECK(story_key IS NULL OR story_key IN ('rabbit','onggojib','seonnyeo','heungbu','bakssi'));
