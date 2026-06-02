import importlib
import pkgutil
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pupoo_ai.app.core.config import settings
from pupoo_ai.app.core.exceptions import register_exception_handlers
from pupoo_ai.app.core.middleware import TraceIdMiddleware

load_dotenv()

ROUTERS_PACKAGE = "pupoo_ai.app.api.routers"
ROUTERS_PATH = Path(__file__).resolve().parent / "api" / "routers"
PUBLIC_GATEWAY_PREFIX = "/ai"


def iter_registered_routers():
    for module_info in sorted(
        pkgutil.iter_modules([str(ROUTERS_PATH)]),
        key=lambda item: item.name,
    ):
        if module_info.name.startswith("_"):
            continue

        module = importlib.import_module(
            f"{ROUTERS_PACKAGE}.{module_info.name}"
        )
        router = getattr(module, "router", None)
        if router is not None:
            yield router


def include_registered_routers(app: FastAPI) -> None:
    # Mirror every route under /ai so the public ingress prefix matches
    # the router map without changing existing internal/backend paths.
    public_alias_router = APIRouter(
        prefix=PUBLIC_GATEWAY_PREFIX,
        include_in_schema=False,
    )

    for router in iter_registered_routers():
        app.include_router(router)
        public_alias_router.include_router(router)

    app.include_router(public_alias_router)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.service_name,
        servers=[
            {
                "url": "http://pupoo-ai.default.svc.cluster.local:8000",
                "description": "K8s internal",
            },
        ],
    )
    app.add_middleware(TraceIdMiddleware)
    register_exception_handlers(app)
    include_registered_routers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


app = create_app()
