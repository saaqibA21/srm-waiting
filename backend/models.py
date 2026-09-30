from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Patient(Base):
    __tablename__ = "patients"

    uhid = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    tokens = relationship("Token", back_populates="patient")
    vitals = relationship("Vitals", back_populates="patient")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_number = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    department = Column(String)

    tokens = relationship("Token", back_populates="doctor")


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token_number = Column(Integer, index=True)
    uhid = Column(String, ForeignKey("patients.uhid"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    issued_at = Column(DateTime, default=datetime.utcnow)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="waiting") # waiting, called, done
    date = Column(Date, index=True)

    patient = relationship("Patient", back_populates="tokens")
    doctor = relationship("Doctor", back_populates="tokens")
    vitals = relationship("Vitals", back_populates="token")


class Vitals(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token_id = Column(Integer, ForeignKey("tokens.id"))
    uhid = Column(String, ForeignKey("patients.uhid"))
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    pulse = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)
    spo2 = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    chief_complaint = Column(Text, nullable=True)
    raw_ocr_text = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    date = Column(Date)
    day_of_week = Column(String)

    token = relationship("Token", back_populates="vitals")
    patient = relationship("Patient", back_populates="vitals")
