from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from sqlalchemy import or_

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=schemas.PatientOut)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.uhid == patient.uhid).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Patient with this UHID already exists")
        
    new_patient = models.Patient(**patient.model_dump())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/{uhid}", response_model=schemas.PatientOut)
def get_patient(uhid: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.uhid == uhid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/", response_model=List[schemas.PatientOut])
def list_patients(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Patient)
    if search:
        query = query.filter(or_(
            models.Patient.name.ilike(f"%{search}%"),
            models.Patient.uhid.ilike(f"%{search}%")
        ))
    return query.all()
