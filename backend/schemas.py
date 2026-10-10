from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    phone: str

class PatientCreate(PatientBase):
    uhid: str

class PatientOut(PatientBase):
    uhid: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DoctorBase(BaseModel):
    name: str
    department: str

class DoctorCreate(DoctorBase):
    doctor_number: str

class DoctorOut(DoctorBase):
    id: int
    doctor_number: str
    model_config = ConfigDict(from_attributes=True)

class TokenCreate(BaseModel):
    uhid: str
    doctor_id: int

class TokenOut(BaseModel):
    id: int
    token_number: int
    uhid: str
    doctor_id: int
    issued_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str
    date: date
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class VitalsBase(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    temperature: Optional[float] = None
    spo2: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    chief_complaint: Optional[str] = None

class VitalsCreate(VitalsBase):
    token_id: int
    uhid: str
    raw_ocr_text: Optional[str] = None
    image_path: Optional[str] = None

class VitalsOut(VitalsBase):
    id: int
    token_id: int
    uhid: str
    raw_ocr_text: Optional[str] = None
    image_path: Optional[str] = None
    recorded_at: datetime
    date: date
    day_of_week: str
    model_config = ConfigDict(from_attributes=True)

class QueueItem(BaseModel):
    token_number: int
    uhid: str
    patient_name: str
    doctor_name: str
    status: str
    issued_at: datetime
    wait_minutes: int
    model_config = ConfigDict(from_attributes=True)

class StatsOut(BaseModel):
    total_today: int
    waiting: int
    called: int
    done: int
    avg_wait_minutes: float
    active_doctors: int

class TokenTransferRequest(BaseModel):
    from_doctor_id: int
    to_doctor_id: int
    token_ids: Optional[List[int]] = None  # None means all pending (waiting/called) tokens today

class TokenTransferResponse(BaseModel):
    transferred_count: int
    from_doctor_name: str
    to_doctor_name: str
    transferred_token_numbers: List[int]
    message: str

class TokenReassignRequest(BaseModel):
    doctor_id: int

class DoctorWorkload(BaseModel):
    id: int
    name: str
    department: str
    doctor_number: str
    waiting_count: int
    called_count: int
    done_count: int
    total_today: int

class AutoBalanceRequest(BaseModel):
    from_doctor_id: int
    token_ids: Optional[List[int]] = None
    same_department_only: bool = True
    target_doctor_ids: Optional[List[int]] = None
    dry_run: bool = False

class AutoBalanceDistributionItem(BaseModel):
    doctor_id: int
    doctor_name: str
    department: str
    previous_load: int
    assigned_count: int
    new_load: int
    transferred_token_numbers: List[int]

class AutoBalanceResponse(BaseModel):
    from_doctor_name: str
    from_doctor_department: str
    total_transferred: int
    distribution: List[AutoBalanceDistributionItem]
    message: str
    dry_run: bool = False

