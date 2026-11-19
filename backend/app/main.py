# ==========================
# Somnia: сервер (FastAPI + SQLAlchemy)
# Запуск з папки backend: uvicorn app.main:app --reload
#
# Входу й реєстрації немає. Кожен браузер автоматично отримує
# свого "гостя" (кука session), і бачить тільки свої записи.
# ==========================

import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc
from sqlalchemy.orm import Session

from . import models
from .database import Base, SessionLocal, engine
from .schemas import SleepRecordCreate

# Як довго браузер "пам'ятає" свій акаунт
SESSION_DAYS = 365

# На https-хостингу постав змінну COOKIE_SECURE=1
COOKIE_SECURE = os.getenv("COOKIE_SECURE") == "1"

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI()

Base.metadata.create_all(bind=engine)


# ==========================
# Статичні файли й сторінки
# ==========================

app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
app.mount("/pages", StaticFiles(directory=FRONTEND_DIR / "pages"), name="pages")

# Папка assets потрібна, тільки якщо вона є
if (FRONTEND_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


@app.get("/")
@app.get("/index.html")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


# ==========================
# База даних і гостьові сесії
# ==========================


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def utc_now():
    # У базі зберігаємо UTC без часового поясу
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_current_user(
    request: Request, response: Response, db: Session = Depends(get_db)
):
    """Знаходить власника кукі session. Якщо куки немає, створює нового гостя."""

    token = request.cookies.get("session")

    if token:
        user = (
            db.query(models.User)
            .join(models.UserSession, models.UserSession.user_id == models.User.id)
            .filter(
                models.UserSession.token == token,
                models.UserSession.expires_at > utc_now(),
            )
            .first()
        )

        if user is not None:
            return user

    user = models.User(
        name="Гість",
        email=f"guest-{secrets.token_hex(8)}@somnia.local",
        password_hash="-",  # увійти за паролем неможливо
        created_at=utc_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    new_token = secrets.token_hex(32)

    db.add(
        models.UserSession(
            token=new_token,
            user_id=user.id,
            expires_at=utc_now() + timedelta(days=SESSION_DAYS),
        )
    )
    db.commit()

    response.set_cookie(
        key="session",
        value=new_token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )

    return user


# ==========================
# Записи про сон
# ==========================


def record_to_dict(record):
    return {
        "id": record.id,
        "start_time": record.start_time,
        "end_time": record.end_time,
        "duration": record.duration,
        "rating": record.rating,
        "mood": record.mood,
        "dream": record.dream or "",
        "note": record.note or "",
    }


def fill_record(sleep, data: SleepRecordCreate):
    mood = (data.mood or "").strip()
    dream = (data.dream or "").strip()
    note = (data.note or "").strip()

    if not 1 <= data.duration <= 24 * 60:
        raise HTTPException(status_code=400, detail="Невірна тривалість сну")
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Оцінка має бути від 1 до 5")
    if not mood or len(mood) > 8:
        raise HTTPException(status_code=400, detail="Невірне самопочуття")
    if len(dream) > 5000 or len(note) > 5000:
        raise HTTPException(status_code=400, detail="Текст занадто довгий")

    sleep.start_time = data.start_time
    sleep.end_time = data.end_time
    sleep.duration = data.duration
    sleep.rating = data.rating
    sleep.mood = mood
    sleep.dream = dream
    sleep.note = note


def find_record(db: Session, sleep_id: int, user):
    sleep = (
        db.query(models.SleepRecord)
        .filter(
            models.SleepRecord.id == sleep_id,
            models.SleepRecord.user_id == user.id,
        )
        .first()
    )

    if sleep is None:
        raise HTTPException(status_code=404, detail="Запис не знайдено")

    return sleep


@app.get("/sleep")
def all_sleep(user=Depends(get_current_user), db: Session = Depends(get_db)):
    records = (
        db.query(models.SleepRecord)
        .filter(models.SleepRecord.user_id == user.id)
        .order_by(desc(models.SleepRecord.start_time))
        .all()
    )

    return [record_to_dict(record) for record in records]


@app.post("/sleep", status_code=201)
def create_sleep(
    data: SleepRecordCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sleep = models.SleepRecord(user_id=user.id)

    fill_record(sleep, data)

    db.add(sleep)
    db.commit()
    db.refresh(sleep)

    return record_to_dict(sleep)


@app.put("/sleep/{sleep_id}")
def update_sleep(
    sleep_id: int,
    data: SleepRecordCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sleep = find_record(db, sleep_id, user)

    fill_record(sleep, data)
    db.commit()

    return {"ok": True}


@app.delete("/sleep/{sleep_id}")
def delete_sleep(
    sleep_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    sleep = find_record(db, sleep_id, user)

    db.delete(sleep)
    db.commit()

    return {"ok": True}