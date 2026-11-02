# Complete bytes have been installed by the same-origin image preparation bridge.
# Only the current scene's small required set is decoded; background plans stay compressed.
init python:
    knol_prepared_image_paths = []

    def knol_decode_prepared_images(command):
        global knol_prepared_image_paths
        paths = command.get("paths", [])
        prepared = 0
        try:
            if len(paths) > 8:
                raise ValueError("Too many required images")
            for path in paths:
                # Bridge accepts only generated, reviewed native image paths.
                # Check the installed file, not loadable(), which includes progressive placeholders.
                fullpath = os.path.join(config.gamedir, path)
                if not path.startswith("assets/") or ".." in path or not os.path.isfile(fullpath):
                    raise ValueError("Full image file is not ready")
                renpy.webloader.to_unlink.pop(fullpath, None)
                renpy.exports.flush_cache_file(path)
                renpy.display.im.cache.get(renpy.display.im.Image(path))
                prepared += 1
            knol_prepared_image_paths = list(paths)
            knol_emit({"protocol": 1, "type": "imagesPrepared", "requestId": command["requestId"],
                "ok": True, "prepared": prepared, "total": len(paths)})
        except Exception as error:
            renpy.log("KnolStory image preparation: " + str(error))
            knol_emit({"protocol": 1, "type": "imagesPrepared", "requestId": command["requestId"],
                "ok": False, "prepared": prepared, "total": len(paths)})
