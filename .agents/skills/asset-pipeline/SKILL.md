# Asset Pipeline Skill

Use for asset IDs, metadata, thumbnails, runtime derivatives, geometry or delivery.

- StoryDocument stores stable Asset IDs, not binary files or cache URLs.
- Keep source, runtime derivative and thumbnail roles distinct.
- Asset resolver maps logical IDs to versioned runtime paths.
- Preserve legacy IDs when existing works depend on them.
- Do not duplicate common assets per student work.
- Optimize runtime images without destroying master/source quality.
