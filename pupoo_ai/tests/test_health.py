import unittest
from unittest.mock import patch

from fastapi.responses import JSONResponse

from pupoo_ai.app.api.routers.health import readiness_check


class HealthRouterTest(unittest.IsolatedAsyncioTestCase):
    async def test_ready_when_database_unconfigured_and_event_model_loaded(self):
        with patch(
            "pupoo_ai.app.api.routers.health.MODEL_REGISTRY.load_status",
            return_value={
                "enabled": True,
                "targets": {
                    "EVENT": {"artifactPresent": True, "loaded": True},
                    "PROGRAM": {"artifactPresent": True, "loaded": True},
                },
            },
        ), patch(
            "pupoo_ai.app.api.routers.health.is_rds_configured",
            return_value=False,
        ):
            response = await readiness_check()

        self.assertIsInstance(response, dict)
        self.assertEqual(response["status"], "ready")
        self.assertEqual(
            response["dependencies"]["congestionPrediction"],
            {
                "configured": True,
                "eventLoaded": True,
                "programLoaded": True,
            },
        )

    async def test_degraded_when_event_model_cannot_load(self):
        with patch(
            "pupoo_ai.app.api.routers.health.MODEL_REGISTRY.load_status",
            return_value={
                "enabled": True,
                "targets": {
                    "EVENT": {"artifactPresent": True, "loaded": False},
                    "PROGRAM": {"artifactPresent": True, "loaded": True},
                },
            },
        ), patch(
            "pupoo_ai.app.api.routers.health.is_rds_configured",
            return_value=False,
        ):
            response = await readiness_check()

        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 503)
        self.assertIn(b"congestion_event_model_unavailable", response.body)


if __name__ == "__main__":
    unittest.main()
