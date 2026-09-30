from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("/", response_model=List[schemas.DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    doctors = db.query(models.Doctor).all()
    return doctors

@router.post("/", response_model=schemas.DoctorOut)
def create_doctor(doctor: schemas.DoctorCreate, db: Session = Depends(get_db)):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.doctor_number == doctor.doctor_number).first()
    if db_doctor:
        raise HTTPException(status_code=400, detail="Doctor number already exists")
        
    new_doctor = models.Doctor(**doctor.model_dump())
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    return new_doctor

@router.get("/workload", response_model=List[schemas.DoctorWorkload])
def get_doctors_workload(db: Session = Depends(get_db)):
    from datetime import date
    today = date.today()
    doctors = db.query(models.Doctor).all()
    results = []
    
    for d in doctors:
        waiting = db.query(models.Token).filter(
            models.Token.date == today,
            models.Token.doctor_id == d.id,
            models.Token.status == "waiting"
        ).count()
        
        called = db.query(models.Token).filter(
            models.Token.date == today,
            models.Token.doctor_id == d.id,
            models.Token.status == "called"
        ).count()
        
        done = db.query(models.Token).filter(
            models.Token.date == today,
            models.Token.doctor_id == d.id,
            models.Token.status == "done"
        ).count()
        
        results.append(schemas.DoctorWorkload(
            id=d.id,
            name=d.name,
            department=d.department,
            doctor_number=d.doctor_number,
            waiting_count=waiting,
            called_count=called,
            done_count=done,
            total_today=waiting + called + done
        ))
        
    return results
