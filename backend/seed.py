from database import SessionLocal, Base, engine
from models import Doctor

def seed_doctors():
    db = SessionLocal()
    try:
        if db.query(Doctor).count() == 0:
            doctors = [
                Doctor(doctor_number='DR-001', name='Dr. Ananya Sharma', department='General Medicine'),
                Doctor(doctor_number='DR-002', name='Dr. Rajesh Kumar', department='Cardiology'),
                Doctor(doctor_number='DR-003', name='Dr. Priya Mehta', department='Pediatrics'),
                Doctor(doctor_number='DR-004', name='Dr. Suresh Patel', department='Orthopedics'),
                Doctor(doctor_number='DR-005', name='Dr. Lakshmi Nair', department='Gynecology'),
            ]
            db.add_all(doctors)
            db.commit()
    finally:
        db.close()

if __name__ == '__main__':
    Base.metadata.create_all(bind=engine)
    seed_doctors()
    print('Database seeded successfully!')
