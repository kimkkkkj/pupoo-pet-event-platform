import importlib
import pkgutil
import sys
import types
import unittest
from pathlib import Path

from fastapi import APIRouter

sys.path.append(str(Path(__file__).resolve().parents[2]))


def _build_fake_router_module(route_specs):
    router = APIRouter()

    for method, path in route_specs:
        if method == "GET":
            router.get(path)(lambda: {"ok": True})
        elif method == "POST":
            router.post(path)(lambda: {"ok": True})
        else:
            raise ValueError(f"unsupported method: {method}")

    return types.SimpleNamespace(router=router)


class RouteAliasTest(unittest.TestCase):
    def test_public_ai_alias_routes_exist(self):
        fake_modules = {
            "pupoo_ai.app.api.routers.health": _build_fake_router_module(
                [("GET", "/health"), ("GET", "/ready")]
            ),
            "pupoo_ai.app.api.routers.chatbot": _build_fake_router_module(
                [
                    ("POST", "/api/chatbot/chat"),
                    ("POST", "/internal/chatbot/chat"),
                    ("POST", "/internal/admin/chatbot/chat"),
                ]
            ),
            "pupoo_ai.app.api.routers.poster": _build_fake_router_module(
                [
                    ("POST", "/api/poster/generate"),
                    ("POST", "/internal/poster/generate"),
                ]
            ),
        }

        fake_iter_modules = lambda *_args, **_kwargs: [
            types.SimpleNamespace(name="chatbot"),
            types.SimpleNamespace(name="health"),
            types.SimpleNamespace(name="poster"),
        ]

        original_import_module = importlib.import_module
        original_iter_modules = pkgutil.iter_modules

        def fake_import_module(name, package=None):
            if name in fake_modules:
                return fake_modules[name]
            return original_import_module(name, package)

        main_path = Path(__file__).resolve().parents[1] / "app" / "main.py"
        module_name = "pupoo_ai_test_app_main"
        sys.modules.pop(module_name, None)

        try:
            importlib.import_module = fake_import_module
            pkgutil.iter_modules = fake_iter_modules

            spec = importlib.util.spec_from_file_location(module_name, main_path)
            module = importlib.util.module_from_spec(spec)
            assert spec.loader is not None
            spec.loader.exec_module(module)
        finally:
            importlib.import_module = original_import_module
            pkgutil.iter_modules = original_iter_modules
            sys.modules.pop(module_name, None)

        paths = {route.path for route in module.app.routes if hasattr(route, "path")}

        expected_paths = {
            "/health",
            "/ready",
            "/api/chatbot/chat",
            "/api/poster/generate",
            "/internal/chatbot/chat",
            "/internal/admin/chatbot/chat",
            "/internal/poster/generate",
            "/ai/health",
            "/ai/ready",
            "/ai/api/chatbot/chat",
            "/ai/api/poster/generate",
            "/ai/internal/chatbot/chat",
            "/ai/internal/admin/chatbot/chat",
            "/ai/internal/poster/generate",
        }

        self.assertTrue(expected_paths.issubset(paths))


if __name__ == "__main__":
    unittest.main()
