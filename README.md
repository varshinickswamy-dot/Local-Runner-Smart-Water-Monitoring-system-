# JalRakshak AI

Smart Water Monitoring System with AI-based leakage, theft, and water-quality detection.

## Project structure
- `backend/` — FastAPI services, authentication, sensor processing, AI model and simulator
- `frontend/` — React + Vite dashboard
- `esp32/` — ESP32 firmware and connection helper scripts

## Setup
1. Configure backend environment variables using a local `backend/.env` file. Do not commit secrets.
2. Install backend dependencies in a virtual environment using your backend dependency manifest (if provided).
3. Install frontend dependencies with `cd frontend && npm install`.
4. Start the backend and frontend using the commands defined by their respective project configuration.

## Security
Environment files, local virtual environments, runtime logs, caches and generated build folders are intentionally excluded from this repository archive. Add your own local credentials through environment variables.
