from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from routers import token_router, vitals_router, doctor_router, patient_router, api_router
from websocket_manager import manager
from seed import seed_doctors

app = FastAPI(title='Hospital OPD Dashboard', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

UPLOAD_DIR = "uploads"

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    seed_doctors()

app.include_router(token_router.router)
app.include_router(vitals_router.router)
app.include_router(doctor_router.router)
app.include_router(patient_router.router)
app.include_router(api_router.router)

@app.websocket("/ws/queue")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {"message": "Hospital OPD API", "docs": "/docs"}
