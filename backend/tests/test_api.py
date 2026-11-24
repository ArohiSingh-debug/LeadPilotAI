
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db


# Separate temporary database for automated tests
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def setup_function():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db


def teardown_function():
    app.dependency_overrides.clear()


client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_lead_and_score():
    lead_data = {
        "name": "Rahul Sharma",
        "email": "rahul@example.com",
        "company": "TechNova Solutions",
        "industry": "SaaS",
        "company_size": 25,
        "budget": 12000,
        "timeline": "Immediate",
        "requirement": (
            "We need an automated lead management and "
            "qualification system to improve our B2B sales "
            "workflow and reduce manual work."
        ),
        "source": "Website",
    }

    response = client.post("/api/leads", json=lead_data)

    assert response.status_code == 201

    result = response.json()

    assert result["name"] == "Rahul Sharma"
    assert result["score"] == 87
    assert result["classification"] == "Hot"


def test_lead_status_update():
    lead_data = {
        "name": "Test User",
        "email": "test@example.com",
        "company": "Demo Company",
        "industry": "SaaS",
        "company_size": 25,
        "budget": 12000,
        "timeline": "Immediate",
        "requirement": "We need an automated sales management system.",
        "source": "Website",
    }

    created = client.post("/api/leads", json=lead_data)
    assert created.status_code == 201

    lead_id = created.json()["id"]

    response = client.patch(
        f"/api/leads/{lead_id}/status",
        json={"status": "Contacted"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Contacted"


def test_analytics_endpoint():
    response = client.get("/api/analytics")

    assert response.status_code == 200
