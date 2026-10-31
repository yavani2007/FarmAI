from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from ultralytics import YOLO
from transformers import pipeline

from PIL import Image, UnidentifiedImageError
from datetime import datetime, timezone

from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from google import genai
from pwdlib import PasswordHash

import io
import tempfile
import edge_tts
import sqlite3
import json
import os
import torch
import torch.nn as nn
from torchvision import models, transforms


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

AGRIBUDDY_API_KEY = os.getenv("AGRIBUDDY_API_KEY")
agribuddy_client = (
    genai.Client(api_key=AGRIBUDDY_API_KEY)
    if AGRIBUDDY_API_KEY
    else None
)


app = FastAPI(
    title="AgriVision AI",
    description="AI-Powered Farm Monitoring and Advisory System",
    version="1.1.0",
)


# React frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database file will be created inside the backend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "agrivision.db")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                crop TEXT NOT NULL,
                location TEXT,
                detection_count INTEGER NOT NULL DEFAULT 0,
                detections_json TEXT NOT NULL,
                disease_analysis_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


initialize_database()

password_hasher = PasswordHash.recommended()


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/signup")
def signup(request: SignupRequest):
    name = request.name.strip()
    email = str(request.email).strip().lower()
    password = request.password

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required."
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    hashed_password = password_hasher.hash(password)
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (name, email, hashed_password, created_at)
            )
            user_id = cursor.lastrowid

        return {
            "message": "Account created successfully.",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }

    except sqlite3.IntegrityError as e:
        error_message = str(e)
        print("Signup database error:", error_message)

        if (
            "users.email" in error_message
            or "UNIQUE constraint failed: users.email" in error_message
        ):
            raise HTTPException(
                status_code=409,
                detail="This email is already registered."
            )

        raise HTTPException(
            status_code=500,
            detail="A database error occurred during signup."
        )


@app.post("/login")
def login(request: LoginRequest):
    email = str(request.email).strip().lower()

    with get_connection() as connection:
        user = connection.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if user is None or not password_hasher.verify(
        request.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    return {
        "message": "Login successful.",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }


# Load AI models
model = YOLO("yolo11n.pt")
# Custom FarmAI disease classification model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_model")
MODEL_PATH = os.path.join(MODEL_DIR, "farmai_efficientnet_b0.pth")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    CLASS_NAMES = json.load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

custom_model = models.efficientnet_b0(weights=None)
custom_model.classifier[1] = nn.Linear(
    custom_model.classifier[1].in_features,
    len(CLASS_NAMES)
)

custom_model.load_state_dict(
    torch.load(MODEL_PATH, map_location=device)
)

custom_model.to(device)
custom_model.eval()

custom_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

disease_classifier = pipeline(
    "image-classification",
    model="kimcomehome/plantvillage-vit-leaf-disease",
)


CROP_LABEL_PREFIXES = {
    "Apple": "Apple___",
    "Blueberry": "Blueberry___",
    "Cherry": "Cherry_(including_sour)___",
    "Corn": "Corn_(maize)___",
    "Grape": "Grape___",
    "Orange": "Orange___",
    "Peach": "Peach___",
    "Pepper": "Pepper,_bell___",
    "Potato": "Potato___",
    "Raspberry": "Raspberry___",
    "Soybean": "Soybean___",
    "Squash": "Squash___",
    "Strawberry": "Strawberry___",
    "Tomato": "Tomato___",
}


@app.get("/")
def home():
    return {
        "message": "AgriVision AI Backend is running!",
        "status": "online",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": os.path.exists(DB_PATH),
    }
@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    crop: str = Form(""),
    location: str = Form(""),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please upload an image.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image. Please upload a valid image file.",
        )

    # ---------------------------------------------------------
    # YOLO OBJECT DETECTION
    # ---------------------------------------------------------

    results = model(image)

    detections = []

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            detection_confidence = float(box.conf[0])
            class_name = result.names[class_id]

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "class": class_name,
                "confidence": round(
                    detection_confidence * 100,
                    2,
                ),
                "box": [
                    round(x1, 2),
                    round(y1, 2),
                    round(x2, 2),
                    round(y2, 2,)
                ],
            })

    # ---------------------------------------------------------
    # FARMAI CUSTOM EFFICIENTNET-B0
    # ---------------------------------------------------------

    image_tensor = custom_transform(
        image
    ).unsqueeze(0).to(device)

    with torch.no_grad():
        output = custom_model(image_tensor)
        probabilities = torch.softmax(
            output,
            dim=1,
        )

    top_k = min(5, len(CLASS_NAMES))

    top_scores, top_indices = torch.topk(
        probabilities,
        k=top_k,
        dim=1,
    )

    predictions = []

    for score, index in zip(
        top_scores[0],
        top_indices[0],
    ):
        label = CLASS_NAMES[index.item()]
        score_percent = float(score.item() * 100)

        predictions.append({
            "label": label,
            "confidence": round(
                score_percent,
                2,
            ),
        })

    # ---------------------------------------------------------
    # BEST PREDICTION
    # ---------------------------------------------------------

    best_index = top_indices[0][0].item()

    confidence = float(
        top_scores[0][0].item() * 100
    )

    raw_label = CLASS_NAMES[best_index]

    crop_name = "Unknown"
    disease_name = "Unknown"

    if "___" in raw_label:
        crop_part, disease_part = raw_label.split(
            "___",
            1,
        )

        crop_name = (
            crop_part
            .replace("_(including_sour)", "")
            .replace("_(maize)", "")
            .replace("_", " ")
            .replace(",", "")
            .strip()
        )

        disease_name = (
            disease_part
            .replace("_", " ")
            .replace("(", "")
            .replace(")", "")
            .strip()
        )

    # ---------------------------------------------------------
    # CROP VALIDATION
    # ---------------------------------------------------------

    if crop:
        selected_crop = crop.strip().lower()
        detected_crop = crop_name.strip().lower()

        crop_aliases = {
            "pepper": "pepper bell",
            "bell pepper": "pepper bell",
            "maize": "corn",
        }

        selected_crop = crop_aliases.get(
            selected_crop,
            selected_crop,
        )

        detected_crop = crop_aliases.get(
            detected_crop,
            detected_crop,
        )

        if selected_crop != detected_crop:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        "The selected crop does not match "
                        "the detected crop."
                    ),
                    "selected_crop": crop,
                    "detected_crop": crop_name,
                    "confidence": round(
                        confidence,
                        2,
                    ),
                },
            )

    # ---------------------------------------------------------
    # CONFIDENCE CHECK
    # ---------------------------------------------------------

    confidence_threshold = 60.0

    if confidence < confidence_threshold:
        disease_status = "low_confidence"

        disease_message = (
            "The AI could not identify the crop and disease "
            "with sufficient confidence. Please upload a clear "
            "leaf image with good lighting."
        )

        crop_name = "Uncertain"
        disease_name = "Uncertain"

    else:
        disease_status = "prediction_available"

        disease_message = (
            "The AI identified the crop and generated a "
            "disease prediction from the uploaded image."
        )

    # ---------------------------------------------------------
    # BASIC ADVISORY
    # ---------------------------------------------------------

    if disease_name.lower() == "healthy":

        recommendation = (
            "The crop appears healthy. Continue regular "
            "irrigation, balanced nutrition, field hygiene, "
            "and regular disease monitoring."
        )

    elif disease_name == "Uncertain":

        recommendation = (
            "The image could not be classified confidently. "
            "Please capture a clear close-up image of the "
            "affected leaf in good lighting and analyze it again."
        )

    else:

        recommendation = (
            f"Possible {disease_name} detected in {crop_name}. "
            "Monitor the affected plants closely, remove severely "
            "affected plant material where appropriate, maintain "
            "good field hygiene, and avoid unnecessary leaf wetness. "
            "Follow locally recommended agricultural treatment "
            "guidance before applying pesticides or fertilizers."
        )

    # ---------------------------------------------------------
    # DISEASE ANALYSIS
    # ---------------------------------------------------------

    disease_analysis = {
        "model": "FarmAI EfficientNet-B0",
        "crop": crop_name,
        "disease": disease_name,
        "confidence": round(
            confidence,
            2,
        ),
        "status": disease_status,
        "predictions": predictions,
        "message": disease_message,
        "recommendation": recommendation,
        "warning": (
            "AI-generated predictions are screening results "
            "and are not guaranteed diagnoses. Verify serious "
            "or unclear crop problems with an agricultural expert."
        ),
    }

    # ---------------------------------------------------------
    # SAVE SCAN
    # ---------------------------------------------------------

    created_at = datetime.now(
        timezone.utc
    ).isoformat()

    with get_connection() as connection:

        cursor = connection.execute(
            """
            INSERT INTO scans (
                filename,
                crop,
                location,
                detection_count,
                detections_json,
                disease_analysis_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                file.filename,
                crop_name,
                location.strip(),
                len(detections),
                json.dumps(detections),
                json.dumps(disease_analysis),
                created_at,
            ),
        )

        scan_id = cursor.lastrowid

    # ---------------------------------------------------------
    # FINAL RESPONSE
    # ---------------------------------------------------------

    return {
        "scan_id": scan_id,
        "filename": file.filename,
        "created_at": created_at,
        "status": "analysis_complete",
        "model": "FarmAI EfficientNet-B0",
        "crop": crop_name,
        "disease": disease_name,
        "confidence": round(
            confidence,
            2,
        ),
        "detections": detections,
        "detection_count": len(detections),
        "disease_analysis": disease_analysis,
        "recommendation": recommendation,
    }
@app.get("/scans")
def get_scans(limit: int = 100):
    """Return recent scan records for Monitoring and Reports."""
    limit = max(1, min(limit, 500))

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM scans
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return {
        "count": len(rows),
        "scans": [
            {
                "id": row["id"],
                "filename": row["filename"],
                "crop": row["crop"],
                "location": row["location"],
                "detection_count": row["detection_count"],
                "detections": json.loads(row["detections_json"]),
                "disease_analysis": json.loads(
                    row["disease_analysis_json"]
                ),
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }


@app.get("/scans/{scan_id}")
def get_scan(scan_id: int):
    """Return one saved scan."""
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM scans WHERE id = ?",
            (scan_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Scan not found.")

    return {
        "id": row["id"],
        "filename": row["filename"],
        "crop": row["crop"],
        "location": row["location"],
        "detection_count": row["detection_count"],
        "detections": json.loads(row["detections_json"]),
        "disease_analysis": json.loads(
            row["disease_analysis_json"]
        ),
        "created_at": row["created_at"],
    }


@app.get("/analytics")
def get_analytics(days: int = 15):
    """Summarize saved farm scans for the selected time period."""
    days = max(1, min(days, 365))

    from datetime import timedelta

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT created_at, detection_count,
                   detections_json, disease_analysis_json
            FROM scans
            ORDER BY created_at ASC
            """
        ).fetchall()

    selected_scans = []

    for row in rows:
        try:
            scan_date = datetime.fromisoformat(
                row["created_at"].replace("Z", "+00:00")
            ).date()

            if start_date <= scan_date <= today:
                selected_scans.append((row, scan_date))
        except (ValueError, TypeError):
            continue

    healthy = 0
    disease = 0
    pest = 0
    daily_counts = {}

    for row, scan_date in selected_scans:
        date_key = scan_date.isoformat()
        daily_counts[date_key] = daily_counts.get(date_key, 0) + 1

        try:
            analysis = json.loads(row["disease_analysis_json"] or "{}")
            predictions = analysis.get("predictions", [])
            detections = json.loads(row["detections_json"] or "[]")

            labels = [
                str(item.get("label", "")).lower()
                for item in predictions
            ]

            if any("healthy" in label for label in labels):
                healthy += 1
            elif predictions:
                disease += 1

            if any(
                any(
                    word in str(item.get("class", "")).lower()
                    for word in ("pest", "insect", "bug")
                )
                for item in detections
            ):
                pest += 1

        except (ValueError, TypeError, AttributeError):
            continue

    daily_scans = [
        {
            "date": (start_date + timedelta(days=offset)).isoformat(),
            "scans": daily_counts.get(
                (start_date + timedelta(days=offset)).isoformat(), 0
            ),
        }
        for offset in range(days)
    ]

    return {
        "period_days": days,
        "total_scans": len(selected_scans),
        "crop_health": {
            "healthy": healthy,
            "disease": disease,
            "pest": pest,
        },
        "daily_scans": daily_scans,
    }


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    if not gemini_client:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured. Check your backend .env file.",
        )

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a message.",
        )

    try:
        response = gemini_client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=(
                "You are AgriVision AI, a helpful agricultural assistant. "
                "Answer farmers clearly and simply. Give practical crop-care "
                "guidance, explain uncertainty, and never present AI predictions "
                "as confirmed diagnoses. Recommend a qualified agricultural "
                "expert for serious or unclear crop problems.\n\n"
                f"User question: {message}"
            ),
        )

        return {
            "reply": response.text
            or "Sorry, I could not generate a reply."
        }

    except Exception as e:
        print("Gemini error:", repr(e))
        raise HTTPException(
            status_code=502,
            detail="Gemini could not respond. Check the backend terminal.",
        )


class AgriBuddyRequest(BaseModel):
    message: str
    language: str = "te-IN"


@app.post("/agribuddy/chat")
async def agribuddy_chat(request: AgriBuddyRequest):
    if not agribuddy_client:
        raise HTTPException(
            status_code=500,
            detail="AgriBuddy API key is not configured.",
        )

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a message.",
        )

    language_name = (
        "Telugu" if request.language == "te-IN" else "English"
    )

    try:
        response = agribuddy_client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=(
                "You are AgriBuddy, a helpful agricultural assistant. "
                f"Answer in {language_name}. "
                "Answer the user's question directly. "
                "Do not greet the user. "
                "Do not introduce yourself. "
                "Do not say hello or namaskaram. "
                "Do not repeat the user's question. "
                "Do not add unnecessary opening or closing messages. "
                "Use simple language and practical farming guidance. "
                "Do not present AI predictions as confirmed diagnoses. "
                "Recommend an agricultural expert for serious crop problems.\n\n"
                f"User question: {message}"
            ),
        )
        return {
            "reply": response.text
            or "Sorry, I could not generate a reply."
        }

    except Exception as error:
        print("AgriBuddy Gemini error:", repr(error))
        raise HTTPException(
            status_code=502,
            detail="AgriBuddy could not respond. Check the backend terminal.",
        )


@app.post("/agribuddy/tts")
async def agribuddy_tts(
    text: str = Form(...),
    language: str = Form("te-IN"),
    background_tasks: BackgroundTasks = None,
):
    voice = (
        "te-IN-MohanNeural"
        if language == "te-IN"
        else "en-IN-NeerjaNeural"
    )

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text is required.",
        )

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".mp3",
    )
    temp_path = temp_file.name
    temp_file.close()

    try:
        communicate = edge_tts.Communicate(
            text.strip(),
            voice,
        )

        await communicate.save(temp_path)

        if background_tasks:
            background_tasks.add_task(
                os.remove,
                temp_path,
            )

        from fastapi.responses import FileResponse

        return FileResponse(
            temp_path,
            media_type="audio/mpeg",
            filename="agribuddy.mp3",
        )

    except Exception as error:
        if os.path.exists(temp_path):
            os.remove(temp_path)

        print("AgriBuddy TTS error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Could not generate voice.",
        )
