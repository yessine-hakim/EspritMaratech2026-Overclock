# 🛒 Pay4All - Inclusive FinCommerce Engine

[![Hackathon](https://img.shields.io/badge/Hackathon-MaraTech-blue)](https://qdrant.tech/)
[![Django](https://img.shields.io/badge/Backend-Django-092e20)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React-61dafb)](https://react.dev/)
[![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-red)](https://qdrant.tech/)
[![Accessibility](https://img.shields.io/badge/A11y-WCAG%202.1-yellow)](https://www.w3.org/WAI/standards-guidelines/wcag/)

**Pay4All** is a voice-first, multimodal e-commerce platform designed to democratize online shopping. It bridges the gap for users with **disabilities** (visual, motor) and strictly **budget-conscious** shoppers by transforming financial constraints from simple filters into intelligent retrieval signals.

### 🏢 Benefiting Association
This solution is developed to benefit **IBSAR** (l'Association IBSAR pour la promotion de la culture et de la technologie pour les aveugles), empowering visually impaired individuals with financial and digital autonomy.

---

## 👥 Team Details
**Team Name**: Team Overclock
**Members**:
*   **Edam Hakim**
*   **Yessine Hakim**
*   **Moez Touil**

---

## 🚀 Main Features

### 🎙️ 1. Intelligent Voice Assistant (Hands-Free)
*   **Contextual Commands**: "Assistant, what is my balance?", "Can I afford this laptop?".
*   **Conversational Logic**: Natural follow-up support without constant wake-words.
*   **Visual Feedback Overlay**: Real-time animation showing listening, thinking, and speaking states.

### 🧠 2. Financial Intelligence Engine
*   **Affordability Checks**: Real-time validation of purchases against user balance and monthly budget.
*   **Intelligent Re-ranking**: Products are sorted based on semantic relevance AND financial alignment.
*   **Banking Integration**: Voice-activated balance checks and secure transfers.

### 🔍 3. Multimodal Search & A11y
*   **Visual Search**: Upload images to find similar products.
*   **Semantic Search**: High-performance retrieval using Qdrant Vector DB.
*   **WCAG 2.1 Compliance**: High contrast modes, screen reader optimization, and font scaling.

---

## 🛠 Technologies Used

### Backend
*   **Django 5** & Django REST Framework
*   **LangChain** (Orchestration)
*   **Qdrant** (Vector Database)
*   **FastEmbed** (Embeddings)
*   **PostgreSQL** (Relational Database)

### Frontend
*   **React 18** (Vite)
*   **Web Speech API** (Voice Recognition & TTS)
*   **Vanilla CSS** (Premium A11y UI)

---

## ⚙️ Installation & Usage

### 📋 Prerequisites
*   **Python 3.10+**
*   **Node.js 18+**

### 🛠 Setup Instructions

### 1. Clone & Navigate
```bash
git clone https://github.com/yessine-hakim/EspritMaratech2026-Overclock.git
cd EspritMaratech2026-Overclock
```

### 2. Create Virtual Environment
**Windows:**
```bash
cd backend
python -m venv env
.\env\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv env
source env/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Development Server
```bash
python manage.py runserver
```

---

### 🌐 Frontend Development (Optional)
If you wish to run the frontend independently:
```bash
cd frontend
npm install
npm run dev
```

---

### 💡 How to Use
1.  Visit **`http://localhost:8000/`** to access the application.
2.  **Register/Login**: Set your budget profile during registration to enable financial intelligence.
3.  **Voice Interaction**: 
    - Click the **Microphone icon** or say **"Hey Assistant"**.
    - Try commands like: *"What is my balance?"* or *"Search for milk"*.

---

#MaraTechEsprit2026
