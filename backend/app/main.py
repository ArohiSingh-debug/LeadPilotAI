
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import Base, engine, get_db
from .models import Lead
from .schemas import LeadCreate, LeadResponse, LeadStatusUpdate
from .services.scoring import score_lead, generate_response


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LeadPilot AI API",
    description="Demo lead qualification and sales workflow API",
    version="1.0.0"
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://lead-pilot-ai-beta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "LeadPilot AI"
    }


# Get All Leads
@app.get("/api/leads", response_model=list[LeadResponse])
def get_leads(
    search: str | None = None,
    classification: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Lead)

    if search:
        term = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(term)) |
            (Lead.company.ilike(term)) |
            (Lead.email.ilike(term))
        )

    if classification and classification.lower() != "all":
        query = query.filter(
            Lead.classification == classification.title()
        )

    return query.order_by(Lead.created_at.desc()).all()


# Create Lead
@app.post(
    "/api/leads",
    response_model=LeadResponse,
    status_code=201
)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db)
):
    data = payload.model_dump()
    data["email"] = str(data["email"]) if data["email"] else ""

    lead = Lead(**data)

    result = score_lead(lead)

    lead.score = result["score"]
    lead.classification = result["classification"]
    lead.qualification_reason = result["qualification_reason"]
    lead.suggested_response = generate_response(lead)

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


# Get Single Lead
@app.get(
    "/api/leads/{lead_id}",
    response_model=LeadResponse
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found"
        )

    return lead


# Update Lead Status
@app.patch(
    "/api/leads/{lead_id}/status",
    response_model=LeadResponse
)
def update_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    db: Session = Depends(get_db)
):
    allowed = {
        "New",
        "Contacted",
        "Qualified",
        "Converted",
        "Disqualified"
    }

    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {sorted(allowed)}"
        )

    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found"
        )

    lead.status = payload.status

    db.commit()
    db.refresh(lead)

    return lead


# Generate Lead Response
@app.post(
    "/api/leads/{lead_id}/generate-response",
    response_model=LeadResponse
)
def regenerate_response(
    lead_id: int,
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id
    ).first()

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found"
        )

    lead.suggested_response = generate_response(lead)

    db.commit()
    db.refresh(lead)

    return lead


# Analytics
@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    total = db.query(
        func.count(Lead.id)
    ).scalar() or 0

    hot = db.query(
        func.count(Lead.id)
    ).filter(
        Lead.classification == "Hot"
    ).scalar() or 0

    warm = db.query(
        func.count(Lead.id)
    ).filter(
        Lead.classification == "Warm"
    ).scalar() or 0

    cold = db.query(
        func.count(Lead.id)
    ).filter(
        Lead.classification == "Cold"
    ).scalar() or 0

    average = db.query(
        func.avg(Lead.score)
    ).scalar() or 0

    return {
        "total_leads": total,
        "hot_leads": hot,
        "warm_leads": warm,
        "cold_leads": cold,
        "average_score": round(float(average), 1)
    }
