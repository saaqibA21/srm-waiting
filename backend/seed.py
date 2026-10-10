from database import SessionLocal, Base, engine
from models import Doctor

def seed_doctors():
    db = SessionLocal()
    try:
        doctors_data = [
            {'doctor_number': 'DR-001', 'name': 'Dr. Ananya Sharma', 'department': 'General Medicine'},
            {'doctor_number': 'DR-002', 'name': 'Dr. Rajesh Kumar', 'department': 'Cardiology'},
            {'doctor_number': 'DR-003', 'name': 'Dr. Priya Mehta', 'department': 'Pediatrics'},
            {'doctor_number': 'DR-004', 'name': 'Dr. Suresh Patel', 'department': 'Orthopedics'},
            {'doctor_number': 'DR-005', 'name': 'Dr. Lakshmi Nair', 'department': 'Gynecology'},
            {'doctor_number': 'DR-006', 'name': 'Dr. Vikram Sen', 'department': 'General Medicine'},
            {'doctor_number': 'DR-007', 'name': 'Dr. Kavita Reddy', 'department': 'General Medicine'},
            {'doctor_number': 'DR-008', 'name': 'Dr. Amit Verma', 'department': 'Cardiology'},
        ]
        for d in doctors_data:
            existing = db.query(Doctor).filter(Doctor.doctor_number == d['doctor_number']).first()
            if not existing:
                db.add(Doctor(**d))
        db.commit()
    finally:
        db.close()

if __name__ == '__main__':
    Base.metadata.create_all(bind=engine)
    seed_doctors()
    print('Database seeded successfully!')
