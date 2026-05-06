from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Gesture Smart Home API")
api_router = APIRouter(prefix="/api")


# ============ MODELS ============
class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    type: Literal["light", "fan"]
    on: bool = False
    level: int = 50  # brightness (0-100) for light, speed (1-5) for fan
    location: str = ""


class DeviceUpdate(BaseModel):
    on: Optional[bool] = None
    level: Optional[int] = None


class GestureEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gesture: str
    confidence: float = 0.0
    action: str  # e.g. "POWER_ON", "INCREASE_LEVEL", "SELECT_NEXT"
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GestureEventCreate(BaseModel):
    gesture: str
    confidence: float = 0.0
    action: str
    device_id: Optional[str] = None
    device_name: Optional[str] = None


# ============ DEFAULTS ============
DEFAULT_DEVICES = [
    {"id": "living-light", "name": "Living Room Light", "type": "light", "on": False, "level": 70, "location": "Living Room"},
    {"id": "bedroom-light", "name": "Bedroom Light", "type": "light", "on": False, "level": 50, "location": "Bedroom"},
    {"id": "ceiling-fan", "name": "Ceiling Fan", "type": "fan", "on": False, "level": 3, "location": "Living Room"},
]


async def ensure_devices():
    count = await db.devices.count_documents({})
    if count == 0:
        await db.devices.insert_many([dict(d) for d in DEFAULT_DEVICES])


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Gesture Smart Home API", "version": "1.0"}


@api_router.get("/devices", response_model=List[Device])
async def list_devices():
    await ensure_devices()
    devices = await db.devices.find({}, {"_id": 0}).to_list(100)
    # preserve insertion order using DEFAULT_DEVICES order
    order = {d["id"]: i for i, d in enumerate(DEFAULT_DEVICES)}
    devices.sort(key=lambda d: order.get(d["id"], 99))
    return devices


@api_router.patch("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, update: DeviceUpdate):
    await ensure_devices()
    existing = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    payload = {k: v for k, v in update.model_dump().items() if v is not None}
    if "level" in payload:
        if existing["type"] == "light":
            payload["level"] = max(0, min(100, payload["level"]))
        else:
            payload["level"] = max(1, min(5, payload["level"]))
    if payload:
        await db.devices.update_one({"id": device_id}, {"$set": payload})
    updated = await db.devices.find_one({"id": device_id}, {"_id": 0})
    return updated


@api_router.post("/devices/reset", response_model=List[Device])
async def reset_devices():
    await db.devices.delete_many({})
    await db.devices.insert_many([dict(d) for d in DEFAULT_DEVICES])
    devices = await db.devices.find({}, {"_id": 0}).to_list(100)
    order = {d["id"]: i for i, d in enumerate(DEFAULT_DEVICES)}
    devices.sort(key=lambda d: order.get(d["id"], 99))
    return devices


@api_router.post("/gesture-events", response_model=GestureEvent)
async def create_gesture_event(payload: GestureEventCreate):
    event = GestureEvent(**payload.model_dump())
    doc = event.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.gesture_events.insert_one(doc)
    return event


@api_router.get("/gesture-events", response_model=List[GestureEvent])
async def list_gesture_events(limit: int = 50):
    cursor = db.gesture_events.find({}, {"_id": 0}).sort("timestamp", -1).limit(min(max(1, limit), 200))
    events = await cursor.to_list(200)
    for e in events:
        if isinstance(e.get("timestamp"), str):
            e["timestamp"] = datetime.fromisoformat(e["timestamp"])
    return events


@api_router.delete("/gesture-events")
async def clear_gesture_events():
    result = await db.gesture_events.delete_many({})
    return {"deleted": result.deleted_count}


@api_router.get("/stats")
async def stats():
    total_events = await db.gesture_events.count_documents({})
    devices_count = await db.devices.count_documents({})
    pipeline = [
        {"$group": {"_id": "$gesture", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_gesture = await db.gesture_events.aggregate(pipeline).to_list(100)
    return {
        "total_events": total_events,
        "devices": devices_count,
        "by_gesture": [{"gesture": g["_id"], "count": g["count"]} for g in by_gesture],
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    await ensure_devices()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
