# FarmAI – AI-Based Farm Monitoring & Advisory System

##About the Project
FarmAI is an AI-based agriculture project designed to help farmers identify crop diseases and get useful farming recommendations.

Farmers can upload crop images and receive disease analysis through an AI-based system.

## Objectives
- Identify crop diseases using AI and Machine Learning.
- Help farmers detect plant health problems.
- Provide useful agricultural recommendations.
- Make farming information easier to understand.

## Key Features
- Crop image upload and scanning.
- AI-based crop disease prediction.
- Disease analysis and advisory.
- Farmer-friendly dashboard.
- Agricultural chatbot (development in progress).

## Technologies Used
**Frontend:**
- React.js
- HTML
- CSS
- JavaScript

**Backend:**
- Python
- FastAPI

**AI / Machine Learning:**
- YOLO
- EfficientNet-B0
- PyTorch

**Database:**
- SQLite

## Project Structure
- `backend/` – Backend API and AI model files.
- `frontend/` – React frontend application.
- `backend/trained_model/` – Trained disease classification model.

## How to Run the Project

### Backend
1. Open the backend folder.
2. Activate the Python virtual environment.
3. Install the required dependencies.
4. Run:

`python -m uvicorn main:app --reload`

Backend URL: `http://127.0.0.1:8000`

### Frontend
1. Open the frontend folder.
2. Install dependencies using `npm install`.
3. Run:

`npm run dev`

Frontend URL: `http://localhost:5173/`

## Project Status
This project is currently under development. Some features and model improvements are still in progress.

## Future Enhancements
- Improve disease prediction accuracy.
- Add more crop and disease categories.
- Improve agricultural advisory.
- Enhance the chatbot functionality.
- Support multiple regions.
