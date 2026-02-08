# 🛒 Pay4All - Inclusive FinCommerce Engine

[![Hackathon](https://img.shields.io/badge/Hackathon-Maratech-blue)](https://qdrant.tech/)
[![Django](https://img.shields.io/badge/Backend-Django-092e20)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React-61dafb)](https://react.dev/)
[![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-red)](https://qdrant.tech/)
[![Accessibility](https://img.shields.io/badge/A11y-WCAG%202.1-yellow)](https://www.w3.org/WAI/standards-guidelines/wcag/)

**Pay4All** is a 

It serves two critical missions:
1.  **Financial Inclusion**: Integrating budget constraints and payment preferences directly into the recommendation logic.
2.  **Digital Accessibility**: Empowering blind, visually impaired, and motor-impaired users to shop independently via an AI voice assistant.

---

## 🌟 The Vision

Modern e-commerce platforms often fail two groups of users: those with strict financial constraints and those with disabilities. 
**Pay4All** solves this by:
*   Transforming **financial constraints** (budget, installments) from late-stage filters into first-class retrieval signals.
*   Providing a **voice-first interface** that allows full shopping independence without requiring a screen or mouse.

### 🌍 Social Impact
*   **Autonomy**: Enables independent living for the visually impaired.
*   **Inclusion**: Makes premium e-commerce experiences accessible to everyone.
*   **Confidence**: providing real-time affordability checks ("Can I afford this?") before checkout.

---

## 🚀 Key Features

### 🧠 Core Intelligence
*   **Multimodal Semantic Search**: Find products using intent-driven queries (e.g., *"affordable smartwatch for health tracking"*) or by uploading reference images.
*   **Financial Intelligence**: Recommendations are re-ranked based on your specific budget ($100 vs $1000) and preferred payment methods (Cash vs Installments).
*   **RAG-First Architecture**: Every recommendation is grounded in retrieved evidence from the **Qdrant** vector database, ensuring accuracy.
*   **Explainable Recommendations**: The AI explains *why* a product was suggested, linking features directly to your budget.

### 🎙️ Accessibility Suite
*   **Voice Assistant**: Fully navigable via natural language commands ("Create my shopping list", "Add milk", "Check total price").
*   **Hands-Free Shopping**: Manage lists, specific products, and checkout without touching a the screen.
*   **Price Verification**: Voice-based affordability checks to ensure users stay within their means.
*   **Screen Reader Optimization**: Native semantic HTML and ARIA labels for compatibility with tools like NVDA and VoiceOver.

---

## 🏗 System Architecture

Pay4All follows a modular three-layer design:

1.  **Embedding Layer**:
    *   **Text**: `BAAI/bge-small-en-v1.5` for high-performance semantic understanding.
    *   **Vision**: `CLIP-ViT-B-32` for image-based search and zero-shot categorization.
2.  **Vector Memory (Qdrant)**:
    *   Stores extensive product metadata (price, nutritional info, reviews).
    *   Performs high-speed similarity search with hybrid filtering.
3.  **Reasoning Layer**:
    *   A composite scoring function balancing semantic relevance with financial alignment:
    *   $$Score = \alpha \cdot Sim + \beta \cdot BudgetFit + \gamma \cdot PaymentMatch$$

---

## 🛠 Tech Stack

*   **Backend**: Django 5 + Django REST Framework (Python)
*   **Frontend**: React 18 + Vite + Tailwind CSS
*   **AI & Search**: Qdrant (Vector DB), LangChain, FastEmbed
*   **Database**: PostgreSQL
*   **Authentication**: JWT / Session-based Auth

---

## 👥 Target Users

*   **Blind & Visually Impaired**: Reducing dependence on sighted assistance.
*   **Motor Impaired**: Enabling mouse-free navigation.
*   **Seniors**: Simplifying complex interfaces into natural conversation.
*   **Budget-Conscious Shoppers**: Prioritizing financial health in purchase decisions.

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js & npm
*   Qdrant (Cloud or Local Docker)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yessine-hakim/Pay4All.git
cd Pay4All
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start shopping!

---

## 👥 Team Overclock
*   **Edam Hakim**
*   **Yessine Hakim**
*   **Moez Touil**
