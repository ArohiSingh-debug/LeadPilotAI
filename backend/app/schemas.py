from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr | None = None
    company: str = Field(min_length=2, max_length=160)
    industry: str = "Other"
    company_size: int = Field(default=1, ge=1)
    budget: float = Field(default=0, ge=0)
    timeline: str = "Not specified"
    requirement: str = Field(min_length=10, max_length=3000)
    source: str = "Website"

class LeadStatusUpdate(BaseModel):
    status: str

class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    company: str
    industry: str
    company_size: int
    budget: float
    timeline: str
    requirement: str
    source: str
    score: int
    classification: str
    qualification_reason: str
    suggested_response: str
    status: str
    created_at: datetime
