from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import api_keys, directories, devices, storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="RadishMD Cloud Storage", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(storage.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(directories.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
