"""HTTP routes for HonorLee prompt library and cover media browsing."""

from __future__ import annotations

from . import prompt_library_media as media
from . import prompt_library_store as store


def register_routes() -> None:
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception:
        return

    if getattr(PromptServer.instance, "_honorlee_prompt_library_routes", False):
        return
    PromptServer.instance._honorlee_prompt_library_routes = True
    routes = PromptServer.instance.routes

    def query(request, name: str) -> str:
        return str(request.rel_url.query.get(name, "")).strip()

    def refused(error: Exception):
        return web.json_response({"error": str(error)}, status=400)

    @routes.get("/honorlee/prompt_library")
    async def get_library(request):
        tag = query(request, "tag") or None
        try:
            payload = store.list_library(tag)
        except Exception as error:
            return refused(error)
        return web.json_response(payload)

    @routes.put("/honorlee/prompt_library/item")
    async def put_item(request):
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "invalid json"}, status=400)
        if not isinstance(body, dict):
            return web.json_response({"error": "body must be an object"}, status=400)
        try:
            item = store.upsert_item(body)
        except ValueError as error:
            return refused(error)
        except Exception as error:
            return web.json_response({"error": str(error)}, status=500)
        return web.json_response({"item": item})

    @routes.delete("/honorlee/prompt_library/item")
    async def delete_item_route(request):
        item_id = query(request, "id")
        try:
            ok = store.delete_item(item_id)
        except ValueError as error:
            return refused(error)
        if not ok:
            return web.json_response({"error": "prompt not found"}, status=404)
        return web.json_response({"ok": True})

    @routes.get("/honorlee/media/folders")
    async def media_folders(request):
        source = query(request, "source") or "input"
        folder = query(request, "folder")
        try:
            root = media.root_path(source)
            names = media.list_folders(root, folder, source)
            shown = media.clean_folder(folder)
        except (ValueError, RuntimeError) as error:
            return refused(error)
        return web.json_response({"source": source, "folder": shown, "folders": names})

    @routes.get("/honorlee/media/list")
    async def media_list(request):
        source = query(request, "source") or "input"
        folder = query(request, "folder")
        subfolders = query(request, "subfolders") == "1"
        try:
            root = media.root_path(source)
            shown = media.clean_folder(folder)
            listed = media.list_pictures(root, shown, subfolders, source)
        except (ValueError, RuntimeError) as error:
            return refused(error)
        return web.json_response({
            "source": source,
            "folder": shown,
            "full": len(listed) >= media.MAX_PICTURES,
            "pictures": [{"name": item["name"], "v": int(item["mtime"])} for item in listed],
        })

    @routes.get("/honorlee/media/thumb")
    async def media_thumb(request):
        source = query(request, "source") or "input"
        name = query(request, "name").replace("\\", "/")
        folder = query(request, "folder")
        try:
            root = media.root_path(source)
            path = media.resolve_image(root, folder, name)
            try:
                edge = int(query(request, "size") or 160)
            except ValueError:
                edge = 160
            data = media.thumbnail_bytes(path, edge)
        except ValueError as error:
            msg = str(error)
            status = 404 if "no such" in msg else 400
            return web.json_response({"error": msg}, status=status)
        except Exception:
            return web.json_response({"error": "this picture cannot be shown"}, status=415)
        return web.Response(body=data, content_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})

    @routes.delete("/honorlee/media/delete")
    async def media_delete(request):
        source = query(request, "source") or "input"
        folder = query(request, "folder")
        name = query(request, "name").replace("\\", "/")
        if not name:
            return web.json_response({"error": "name required"}, status=400)
        try:
            root = media.root_path(source)
            path = media.resolve_image(root, folder, name)
            path.unlink()
        except ValueError as error:
            msg = str(error)
            status = 404 if "no such" in msg else 400
            return web.json_response({"error": msg}, status=status)
        except OSError as error:
            return web.json_response({"error": str(error)}, status=500)
        return web.json_response({"ok": True})


register_routes()
