"""Backend API tests for Gesture Smart Home."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback to frontend .env file if env var not set in test runner
if not BASE_URL:
    from pathlib import Path
    env_file = Path("/app/frontend/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def reset_state(client):
    # Ensure a clean start
    client.post(f"{API}/devices/reset", timeout=30)
    client.delete(f"{API}/gesture-events", timeout=30)
    yield
    client.delete(f"{API}/gesture-events", timeout=30)
    client.post(f"{API}/devices/reset", timeout=30)


# --- Devices ---
class TestDevices:
    def test_list_devices_autoseed(self, client):
        r = client.get(f"{API}/devices", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 3
        ids = {d["id"] for d in data}
        assert ids == {"living-light", "bedroom-light", "ceiling-fan"}
        for d in data:
            assert "_id" not in d
            assert {"id", "name", "type", "on", "level", "location"} <= set(d.keys())

    def test_patch_turn_on(self, client):
        r = client.patch(f"{API}/devices/living-light", json={"on": True}, timeout=30)
        assert r.status_code == 200
        assert r.json()["on"] is True
        # Persistence check
        g = client.get(f"{API}/devices", timeout=30).json()
        ll = next(d for d in g if d["id"] == "living-light")
        assert ll["on"] is True

    def test_light_level_clamp_upper(self, client):
        r = client.patch(f"{API}/devices/bedroom-light", json={"level": 150}, timeout=30)
        assert r.status_code == 200
        assert r.json()["level"] == 100

    def test_light_level_90_retained(self, client):
        r = client.patch(f"{API}/devices/bedroom-light", json={"level": 90}, timeout=30)
        assert r.status_code == 200
        # 90 is within 0-100 so should remain 90
        assert r.json()["level"] == 90

    def test_fan_level_clamp(self, client):
        r = client.patch(f"{API}/devices/ceiling-fan", json={"level": 10}, timeout=30)
        assert r.status_code == 200
        # Fan clamps to 1-5
        assert r.json()["level"] == 5

    def test_fan_level_clamp_lower(self, client):
        r = client.patch(f"{API}/devices/ceiling-fan", json={"level": 0}, timeout=30)
        assert r.status_code == 200
        assert r.json()["level"] == 1

    def test_patch_nonexistent_returns_404(self, client):
        r = client.patch(f"{API}/devices/nope-xyz", json={"on": True}, timeout=30)
        assert r.status_code == 404

    def test_reset_returns_defaults(self, client):
        # mutate
        client.patch(f"{API}/devices/living-light", json={"on": True, "level": 10}, timeout=30)
        r = client.post(f"{API}/devices/reset", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        ll = next(d for d in data if d["id"] == "living-light")
        assert ll["on"] is False
        assert ll["level"] == 70


# --- Gesture Events ---
class TestGestureEvents:
    def test_create_event(self, client):
        client.delete(f"{API}/gesture-events", timeout=30)
        payload = {
            "gesture": "Open_Palm",
            "confidence": 0.95,
            "action": "POWER_ON",
            "device_id": "living-light",
            "device_name": "Living Room Light",
        }
        r = client.post(f"{API}/gesture-events", json=payload, timeout=30)
        assert r.status_code == 200
        ev = r.json()
        assert "_id" not in ev
        assert ev["gesture"] == "Open_Palm"
        assert ev["action"] == "POWER_ON"
        assert ev["device_id"] == "living-light"
        assert "id" in ev and "timestamp" in ev

    def test_list_events_sorted_desc(self, client):
        client.delete(f"{API}/gesture-events", timeout=30)
        for i, g in enumerate(["Fist", "Peace", "Thumbs_Up"]):
            client.post(
                f"{API}/gesture-events",
                json={"gesture": g, "confidence": 0.8, "action": "X"},
                timeout=30,
            )
        r = client.get(f"{API}/gesture-events?limit=10", timeout=30)
        assert r.status_code == 200
        events = r.json()
        assert len(events) == 3
        for e in events:
            assert "_id" not in e
        ts = [e["timestamp"] for e in events]
        assert ts == sorted(ts, reverse=True)
        # Most recent first => Thumbs_Up
        assert events[0]["gesture"] == "Thumbs_Up"

    def test_delete_all_events(self, client):
        client.post(
            f"{API}/gesture-events",
            json={"gesture": "Fist", "confidence": 0.7, "action": "POWER_OFF"},
            timeout=30,
        )
        r = client.delete(f"{API}/gesture-events", timeout=30)
        assert r.status_code == 200
        assert "deleted" in r.json()
        g = client.get(f"{API}/gesture-events", timeout=30).json()
        assert g == []


# --- Stats ---
class TestStats:
    def test_stats_aggregation(self, client):
        client.delete(f"{API}/gesture-events", timeout=30)
        for g in ["Fist", "Fist", "Open_Palm"]:
            client.post(
                f"{API}/gesture-events",
                json={"gesture": g, "confidence": 0.8, "action": "X"},
                timeout=30,
            )
        r = client.get(f"{API}/stats", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["total_events"] == 3
        assert data["devices"] == 3
        by = {x["gesture"]: x["count"] for x in data["by_gesture"]}
        assert by.get("Fist") == 2
        assert by.get("Open_Palm") == 1
