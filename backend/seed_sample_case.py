import database
import models
from datetime import date, datetime, timedelta

db = database.SessionLocal()
today = date.today()

sample_patients = [
    {"uhid": "SRM20260101", "name": "Rahul Sharma", "age": 32, "gender": "M", "phone": "9876543210"},
    {"uhid": "SRM20260102", "name": "Pooja Verma", "age": 27, "gender": "F", "phone": "9812345678"},
    {"uhid": "SRM20260103", "name": "Amit Patel", "age": 45, "gender": "M", "phone": "9723456789"},
    {"uhid": "SRM20260104", "name": "Sneha Rao", "age": 23, "gender": "F", "phone": "9634567890"},
    {"uhid": "SRM20260105", "name": "Ramesh Kumar", "age": 52, "gender": "M", "phone": "9845123456"},
    {"uhid": "SRM20260106", "name": "Sunita Devi", "age": 48, "gender": "F", "phone": "9845654321"},
    {"uhid": "SRM20260107", "name": "Vignesh S", "age": 34, "gender": "M", "phone": "9789123456"},
    {"uhid": "SRM20260108", "name": "Priya Rajan", "age": 29, "gender": "F", "phone": "9789654321"},
    {"uhid": "SRM20260109", "name": "Mohammed Farooq", "age": 41, "gender": "M", "phone": "9962123456"},
    {"uhid": "SRM20260110", "name": "Anita Desai", "age": 37, "gender": "F", "phone": "9962654321"},
    {"uhid": "SRM20260111", "name": "Karthik N", "age": 30, "gender": "M", "phone": "9444123456"},
    {"uhid": "SRM20260112", "name": "Meena Sundaram", "age": 55, "gender": "F", "phone": "9444654321"},
    {"uhid": "SRM20260113", "name": "Deepa M", "age": 26, "gender": "F", "phone": "9381123456"},
    {"uhid": "SRM20260114", "name": "Suresh G", "age": 61, "gender": "M", "phone": "9381654321"},
    {"uhid": "SRM20260115", "name": "Arvind Swamy", "age": 49, "gender": "M", "phone": "9176123456"},
    {"uhid": "SRM20260116", "name": "Master Aarav", "age": 6, "gender": "M", "phone": "9176654321"},
    {"uhid": "SRM20260117", "name": "Baby Diya", "age": 4, "gender": "F", "phone": "9282123456"}
]

for p in sample_patients:
    existing = db.query(models.Patient).filter(models.Patient.uhid == p["uhid"]).first()
    if not existing:
        db.add(models.Patient(**p))

db.commit()

# Clean existing tokens for today if any
db.query(models.Token).filter(models.Token.date == today).delete()
db.commit()

# Sample Tokens Plan:
# Dr. Ananya Sharma (Doc 1 - Gen Med): 6 patients
# Token 1: Ramesh Kumar (called)
# Token 2: Sunita Devi (waiting)
# Token 3: Vignesh S (waiting)
# Token 4: Priya Rajan (waiting)
# Token 5: Mohammed Farooq (waiting)
# Token 6: Anita Desai (waiting)
#
# Dr. Vikram Sen (Doc 6 - Gen Med): 2 patients
# Token 7: Karthik N (waiting)
# Token 8: Meena Sundaram (waiting)
#
# Dr. Kavita Reddy (Doc 7 - Gen Med): 1 patient
# Token 9: Deepa M (waiting)
#
# Dr. Rajesh Kumar (Doc 2 - Cardiology): 2 patients
# Token 10: Suresh G (called)
# Token 11: Arvind Swamy (waiting)
#
# Dr. Priya Mehta (Doc 3 - Pediatrics): 2 patients
# Token 12: Master Aarav (done)
# Token 13: Baby Diya (waiting)

tokens_plan = [
    # Dr. Ananya Sharma (General Medicine)
    {"token_number": 1, "uhid": "SRM20260105", "doctor_id": 1, "status": "called", "issued_offset": 60, "called_offset": 10},
    {"token_number": 2, "uhid": "SRM20260106", "doctor_id": 1, "status": "waiting", "issued_offset": 55},
    {"token_number": 3, "uhid": "SRM20260107", "doctor_id": 1, "status": "waiting", "issued_offset": 50},
    {"token_number": 4, "uhid": "SRM20260108", "doctor_id": 1, "status": "waiting", "issued_offset": 45},
    {"token_number": 5, "uhid": "SRM20260109", "doctor_id": 1, "status": "waiting", "issued_offset": 40},
    {"token_number": 6, "uhid": "SRM20260110", "doctor_id": 1, "status": "waiting", "issued_offset": 35},

    # Dr. Vikram Sen (General Medicine)
    {"token_number": 7, "uhid": "SRM20260111", "doctor_id": 6, "status": "waiting", "issued_offset": 48},
    {"token_number": 8, "uhid": "SRM20260112", "doctor_id": 6, "status": "waiting", "issued_offset": 30},

    # Dr. Kavita Reddy (General Medicine)
    {"token_number": 9, "uhid": "SRM20260113", "doctor_id": 7, "status": "waiting", "issued_offset": 25},

    # Dr. Rajesh Kumar (Cardiology)
    {"token_number": 10, "uhid": "SRM20260114", "doctor_id": 2, "status": "called", "issued_offset": 58, "called_offset": 15},
    {"token_number": 11, "uhid": "SRM20260115", "doctor_id": 2, "status": "waiting", "issued_offset": 20},

    # Dr. Priya Mehta (Pediatrics)
    {"token_number": 12, "uhid": "SRM20260116", "doctor_id": 3, "status": "done", "issued_offset": 70, "called_offset": 40, "completed_offset": 5},
    {"token_number": 13, "uhid": "SRM20260117", "doctor_id": 3, "status": "waiting", "issued_offset": 15},
]

now = datetime.utcnow()

for t in tokens_plan:
    issued_time = now - timedelta(minutes=t["issued_offset"])
    called_time = (now - timedelta(minutes=t["called_offset"])) if "called_offset" in t else None
    completed_time = (now - timedelta(minutes=t["completed_offset"])) if "completed_offset" in t else None

    token_obj = models.Token(
        token_number=t["token_number"],
        uhid=t["uhid"],
        doctor_id=t["doctor_id"],
        status=t["status"],
        issued_at=issued_time,
        called_at=called_time,
        completed_at=completed_time,
        date=today
    )
    db.add(token_obj)

db.commit()

# Also seed sample vitals for these patients so VitalsCapture and PatientHistory look complete
sample_vitals = [
    {"token_id": 1, "uhid": "SRM20260105", "bp_systolic": 130, "bp_diastolic": 85, "pulse": 76, "temperature": 98.4, "spo2": 98, "weight": 72.0, "height": 172.0, "chief_complaint": "Persistent cough and mild headache for 3 days"},
    {"token_id": 2, "uhid": "SRM20260106", "bp_systolic": 120, "bp_diastolic": 80, "pulse": 72, "temperature": 99.1, "spo2": 99, "weight": 64.0, "height": 158.0, "chief_complaint": "Low grade fever and throat irritation"},
    {"token_id": 3, "uhid": "SRM20260107", "bp_systolic": 118, "bp_diastolic": 78, "pulse": 70, "temperature": 98.6, "spo2": 98, "weight": 78.5, "height": 175.0, "chief_complaint": "Routine health checkup"},
    {"token_id": 4, "uhid": "SRM20260108", "bp_systolic": 110, "bp_diastolic": 72, "pulse": 80, "temperature": 98.2, "spo2": 100, "weight": 56.0, "height": 162.0, "chief_complaint": "Mild nausea and dizziness"},
    {"token_id": 5, "uhid": "SRM20260109", "bp_systolic": 138, "bp_diastolic": 88, "pulse": 84, "temperature": 98.7, "spo2": 97, "weight": 83.0, "height": 168.0, "chief_complaint": "High blood pressure checkup and leg cramps"},
    {"token_id": 6, "uhid": "SRM20260110", "bp_systolic": 122, "bp_diastolic": 82, "pulse": 74, "temperature": 98.8, "spo2": 99, "weight": 60.5, "height": 160.0, "chief_complaint": "Acidity and abdominal discomfort"},
    {"token_id": 7, "uhid": "SRM20260111", "bp_systolic": 125, "bp_diastolic": 80, "pulse": 78, "temperature": 98.5, "spo2": 98, "weight": 70.0, "height": 170.0, "chief_complaint": "Back pain after lifting heavy box"},
    {"token_id": 10, "uhid": "SRM20260114", "bp_systolic": 145, "bp_diastolic": 92, "pulse": 88, "temperature": 98.6, "spo2": 96, "weight": 85.0, "height": 165.0, "chief_complaint": "Chest tightness and palpitations on climbing stairs"},
]

for v in sample_vitals:
    token_rec = db.query(models.Token).filter(models.Token.token_number == v["token_id"], models.Token.date == today).first()
    if token_rec:
        existing_v = db.query(models.Vitals).filter(models.Vitals.token_id == token_rec.id).first()
        if not existing_v:
            v_obj = models.Vitals(
                token_id=token_rec.id,
                uhid=v["uhid"],
                bp_systolic=v["bp_systolic"],
                bp_diastolic=v["bp_diastolic"],
                pulse=v["pulse"],
                temperature=v["temperature"],
                spo2=v["spo2"],
                weight=v["weight"],
                height=v["height"],
                chief_complaint=v["chief_complaint"],
                recorded_at=now - timedelta(minutes=10),
                date=today,
                day_of_week=today.strftime('%A')
            )
            db.add(v_obj)

db.commit()

print("Successfully seeded realistic OPD sample cases for today!")
tokens = db.query(models.Token).filter(models.Token.date == today).all()
print(f"Total Tokens Today: {len(tokens)}")

db.close()
