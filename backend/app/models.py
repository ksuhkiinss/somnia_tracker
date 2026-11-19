from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from .database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(30), nullable=False)

    email = Column(String(255), unique=True, index=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    # UTC
    created_at = Column(DateTime, nullable=False)


class UserSession(Base):

    __tablename__ = "sessions"

    token = Column(String(64), primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # UTC
    expires_at = Column(DateTime, nullable=False)


class SleepRecord(Base):

    __tablename__ = "sleep_records"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Локальний час користувача без часового поясу
    # (так його надсилає фронтенд: "2026-11-12T23:10:00")
    start_time = Column(DateTime, nullable=False)

    end_time = Column(DateTime, nullable=False)

    duration = Column(Integer, nullable=False)

    rating = Column(Integer, nullable=False)

    mood = Column(String, nullable=False)

    note = Column(String, nullable=False, default="")

    dream = Column(String, nullable=False, default="")