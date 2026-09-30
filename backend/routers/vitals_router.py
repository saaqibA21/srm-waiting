from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, date
from database import get_db
import models
import schemas
import os
import ocr_engine

router = APIRouter(prefix="/vitals", tags=["Vitals"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

from typing import Optional

@router.post("/upload-image")
async def upload_image(token_id: Optional[int] = Form(None), file: UploadFile = File(...)):
    if token_id is None:
        token_id = 1
    image_bytes = await file.read()
    
    process_result = ocr_engine.process_image(image_bytes)
    raw_ocr_text = process_result["raw_ocr_text"]
    parsed_vitals = process_result["vitals_data"]
    
    timestamp = int(datetime.utcnow().timestamp())
    filename = f"{token_id}_{timestamp}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(image_bytes)
        
    return {
        "raw_ocr_text": raw_ocr_text,
        "parsed_vitals": parsed_vitals,
        "image_path": filepath
    }

@router.post("/save", response_model=schemas.VitalsOut)
def save_vitals(vitals_data: schemas.VitalsCreate, db: Session = Depends(get_db)):
    token = db.query(models.Token).filter(models.Token.id == vitals_data.token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    today = date.today()
    new_vitals = models.Vitals(
        **vitals_data.model_dump(),
        recorded_at=datetime.utcnow(),
        date=today,
        day_of_week=today.strftime('%A')
    )
    db.add(new_vitals)
    db.commit()
    db.refresh(new_vitals)
    
    return new_vitals

@router.get("/{token_id}", response_model=schemas.VitalsOut)
def get_vitals(token_id: int, db: Session = Depends(get_db)):
    vitals = db.query(models.Vitals).filter(models.Vitals.token_id == token_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found for this token")
    return vitals
