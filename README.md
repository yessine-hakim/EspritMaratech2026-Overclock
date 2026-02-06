# Pay4All - Context-Aware FinCommerce Engine

[![Hackathon](https://img.shields.io/badge/Hackathon-MaraTech-blue)](https://qdrant.tech/)
[![Django](https://img.shields.io/badge/Backend-Django-092e20)](https://www.djangoproject.com/)
[![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-red)](https://qdrant.tech/)

**Pay4All** (meaning "AI Buy" in Arabic) is a multimodal retrieval-augmented discovery engine designed to bridge the gap between product discovery and financial reality. Developed for the **Vectors In Orbit Hackathon**, it transforms financial constraints from late-stage filters into first-class signals.

---

## 👥 Team Overclock
- **Edam Hakim**
- **Yessine Hakim**
- **Moez Touil**

---

## 🌟 The Vision
Modern e-commerce platforms often ignore a user's financial context, recommending products that are semantically relevant but financially out of reach. **Pay4All** solves this by integrating budget, affordability, and payment preferences directly into the core retrieval pipeline.

### Core Features
- **Multimodal Semantic Search**: Find products using intent-driven queries (e.g., *"affordable smartwatch for health tracking"*) or reference images.
- **Financial Intelligence**: Recommendations are re-ranked based on your specific budget and preferred payment methods (installments, financing).
- **RAG-First Architecture**: Every recommendation is grounded in retrieved evidence from the vector database.
- **Explainable Recommendations**: Understand *why* a product was suggested, with clear reasoning linked to both features and price.

---

## 🏗 System Architecture
Pay4All follows a modular three-layer design:
1. **Embedding Layer**: Uses **BGE-small** for text and **CLIP-ViT** for visual embeddings via FastEmbed.
2. **Vector Memory (Qdrant)**: High-performance similarity search with complex metadata filtering.
3. **Reasoning Layer**: A composite scoring function that balances semantic similarity with financial alignment:
   $$Score = \alpha \cdot Sim + \beta \cdot BudgetFit + \gamma \cdot PaymentMatch$$

---

## 🛠 Tech Stack
- **Backend**: Django (Python)
- **Vector Database**: [Qdrant](https://qdrant.tech/)
- **Embeddings**: FastEmbed (BGE for Text, CLIP for Images)
- **Database**: PostgreSQL
- **Frontend**: HTML5 & Vanilla CSS (Premium Dark Mode UI)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Django 5.x
- Qdrant (Local or Cloud instance)

### Installation

#### 1. **Clone the repository**:
   ```bash
   git clone https://github.com/yessine-hakim/Pay4All.git
   ```

#### 2. Create Virtual Environment
**Windows:**
```bash
python -m venv env
.\env\Scripts\activate
```
**macOS/Linux:**
```bash
python3 -m venv env
source env/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Run the Development Server
```bash
python manage.py runserver
```
Visit `http://127.0.0.1:8000/` to access the application.
