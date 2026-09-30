from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from database import get_db
import models
import schemas
from websocket_manager import manager

router = APIRouter(prefix="/token", tags=["Token"])

@router.post("/generate", response_model=schemas.TokenOut)
async def generate_token(token_data: schemas.TokenCreate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.uhid == token_data.uhid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    doctor = db.query(models.Doctor).filter(models.Doctor.id == token_data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    today = date.today()
    max_token = db.query(func.max(models.Token.token_number)).filter(models.Token.date == today).scalar()
    next_token = (max_token or 0) + 1
    
    new_token = models.Token(
        token_number=next_token,
        uhid=token_data.uhid,
        doctor_id=token_data.doctor_id,
        status="waiting",
        issued_at=datetime.utcnow(),
        date=today
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    out = schemas.TokenOut.model_validate(new_token)
    out.patient_name = patient.name
    out.doctor_name = doctor.name
    
    await manager.broadcast_json({"event": "token_generated", "token": out.model_dump(mode='json')})
    
    return out

@router.get("/queue")
def get_queue(db: Session = Depends(get_db)):
    today = date.today()
    tokens = db.query(models.Token).filter(models.Token.date == today).order_by(models.Token.token_number).all()
    result = []
    for t in tokens:
        out = schemas.TokenOut.model_validate(t)
        if t.patient:
            out.patient_name = t.patient.name
        if t.doctor:
            out.doctor_name = t.doctor.name
        result.append(out)
    return result

@router.post("/next", response_model=schemas.TokenOut)
async def call_next_token(db: Session = Depends(get_db)):
    today = date.today()
    token = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "waiting").order_by(models.Token.token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="No waiting tokens")
        
    token.status = "called"
    token.called_at = datetime.utcnow()
    db.commit()
    db.refresh(token)
    
    out = schemas.TokenOut.model_validate(token)
    if token.patient:
        out.patient_name = token.patient.name
    if token.doctor:
        out.doctor_name = token.doctor.name
        
    await manager.broadcast_json({"event": "token_called", "token": out.model_dump(mode='json')})
    
    return out

@router.post("/complete/{token_id}", response_model=schemas.TokenOut)
async def complete_token(token_id: int, db: Session = Depends(get_db)):
    token = db.query(models.Token).filter(models.Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    token.status = "done"
    token.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(token)
    
    out = schemas.TokenOut.model_validate(token)
    if token.patient:
        out.patient_name = token.patient.name
    if token.doctor:
        out.doctor_name = token.doctor.name
        
    await manager.broadcast_json({"event": "token_completed", "token": out.model_dump(mode='json')})
    
    return out

@router.get("/counter")
def get_counter(db: Session = Depends(get_db)):
    today = date.today()
    total_today = db.query(models.Token).filter(models.Token.date == today).count()
    waiting_count = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "waiting").count()
    
    last_called = db.query(models.Token).filter(models.Token.date == today, models.Token.status == "called").order_by(models.Token.called_at.desc()).first()
    current_token = last_called.token_number if last_called else 0
    
    return {
        "current_token": current_token,
        "waiting_count": waiting_count,
        "total_today": total_today
    }

@router.post("/transfer", response_model=schemas.TokenTransferResponse)
async def transfer_doctor_patients(req: schemas.TokenTransferRequest, db: Session = Depends(get_db)):
    from_doc = db.query(models.Doctor).filter(models.Doctor.id == req.from_doctor_id).first()
    if not from_doc:
        raise HTTPException(status_code=404, detail="Origin doctor not found")
        
    to_doc = db.query(models.Doctor).filter(models.Doctor.id == req.to_doctor_id).first()
    if not to_doc:
        raise HTTPException(status_code=404, detail="Destination doctor not found")
        
    if req.from_doctor_id == req.to_doctor_id:
        raise HTTPException(status_code=400, detail="Origin and destination doctor cannot be the same")
        
    today = date.today()
    query = db.query(models.Token).filter(
        models.Token.date == today,
        models.Token.doctor_id == req.from_doctor_id,
        models.Token.status.in_(["waiting", "called"])
    )
    
    if req.token_ids and len(req.token_ids) > 0:
        query = query.filter(models.Token.id.in_(req.token_ids))
        
    tokens_to_transfer = query.all()
    if not tokens_to_transfer:
        return schemas.TokenTransferResponse(
            transferred_count=0,
            from_doctor_name=from_doc.name,
            to_doctor_name=to_doc.name,
            transferred_token_numbers=[],
            message="No pending patients found to transfer for this doctor."
        )
        
    transferred_token_numbers = []
    for t in tokens_to_transfer:
        t.doctor_id = req.to_doctor_id
        transferred_token_numbers.append(t.token_number)
        
    db.commit()
    
    # Broadcast transfer to all connected frontend screens via WebSocket
    await manager.broadcast_json({
        "event": "patients_transferred",
        "count": len(tokens_to_transfer),
        "from_doctor": from_doc.name,
        "to_doctor": to_doc.name,
        "token_numbers": transferred_token_numbers
    })
    
    return schemas.TokenTransferResponse(
        transferred_count=len(tokens_to_transfer),
        from_doctor_name=from_doc.name,
        to_doctor_name=to_doc.name,
        transferred_token_numbers=transferred_token_numbers,
        message=f"Successfully shifted {len(tokens_to_transfer)} patients from {from_doc.name} to {to_doc.name}."
    )

@router.post("/{token_id}/reassign", response_model=schemas.TokenOut)
async def reassign_single_token(token_id: int, req: schemas.TokenReassignRequest, db: Session = Depends(get_db)):
    token = db.query(models.Token).filter(models.Token.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    to_doc = db.query(models.Doctor).filter(models.Doctor.id == req.doctor_id).first()
    if not to_doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    token.doctor_id = req.doctor_id
    db.commit()
    db.refresh(token)
    
    out = schemas.TokenOut.model_validate(token)
    if token.patient:
        out.patient_name = token.patient.name
    out.doctor_name = to_doc.name
    
    await manager.broadcast_json({
        "event": "token_reassigned",
        "token_id": token.id,
        "token_number": token.token_number,
        "doctor_name": to_doc.name
    })
    
    return out
