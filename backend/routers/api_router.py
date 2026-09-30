from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List, Optional
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api", tags=["API"])

@router.get("/patients")
def list_patients_api(
    date_filter: Optional[date] = None, 
    doctor_id: Optional[int] = None, 
    uhid: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Patient).join(models.Token)
    
    if date_filter:
        query = query.filter(models.Token.date == date_filter)
    if doctor_id:
        query = query.filter(models.Token.doctor_id == doctor_id)
    if uhid:
        query = query.filter(models.Patient.uhid == uhid)
        
    patients = query.distinct().all()
    
    result = []
    for p in patients:
        p_dict = schemas.PatientOut.model_validate(p).model_dump()
        latest_token = db.query(models.Token).filter(models.Token.uhid == p.uhid).order_by(models.Token.issued_at.desc()).first()
        if latest_token:
            p_dict["latest_token"] = schemas.TokenOut.model_validate(latest_token).model_dump()
        result.append(p_dict)
        
    return result

@router.get("/patients/{uhid}")
def get_patient_profile(uhid: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.uhid == uhid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    tokens = db.query(models.Token).filter(models.Token.uhid == uhid).order_by(models.Token.issued_at.desc()).all()
    
    patient_data = schemas.PatientOut.model_validate(patient).model_dump()
    patient_data["tokens"] = [schemas.TokenOut.model_validate(t).model_dump() for t in tokens]
    
    return patient_data

@router.get("/patients/{uhid}/vitals")
def get_patient_vitals(uhid: str, db: Session = Depends(get_db)):
    vitals = db.query(models.Vitals).filter(models.Vitals.uhid == uhid).order_by(models.Vitals.recorded_at.desc()).all()
    return [schemas.VitalsOut.model_validate(v).model_dump() for v in vitals]

@router.get("/tokens/today")
def get_today_tokens(db: Session = Depends(get_db)):
    today = date.today()
    tokens = db.query(models.Token).filter(models.Token.date == today).order_by(models.Token.token_number).all()
    
    result = []
    for t in tokens:
        t_dict = schemas.TokenOut.model_validate(t).model_dump()
        if t.patient:
            t_dict["patient_name"] = t.patient.name
        if t.doctor:
            t_dict["doctor_name"] = t.doctor.name
            
        vitals = db.query(models.Vitals).filter(models.Vitals.token_id == t.id).first()
        t_dict["has_vitals"] = vitals is not None
        result.append(t_dict)
        
    return result

@router.get("/stats", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    
    total_tokens = db.query(models.Token).filter(models.Token.date == today).count()
    waiting = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "waiting").count()
    called = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "called").count()
    done = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "done").count()
    
    completed_tokens = db.query(models.Token).filter(
        models.Token.date == today, 
        models.Token.completed_at.isnot(None),
        models.Token.issued_at.isnot(None)
    ).all()
    
    avg_wait = 0
    if completed_tokens:
        total_minutes = sum((t.completed_at - t.issued_at).total_seconds() / 60 for t in completed_tokens)
        avg_wait = total_minutes / len(completed_tokens)
        
    active_doctors = db.query(models.Token.doctor_id).filter(models.Token.date == today).distinct().count()
    
    return schemas.StatsOut(
        total_today=total_tokens,
        waiting=waiting,
        called=called,
        done=done,
        avg_wait_minutes=round(avg_wait, 2),
        active_doctors=active_doctors
    )
