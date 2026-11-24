from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), default="")
    company: Mapped[str] = mapped_column(String(160))
    industry: Mapped[str] = mapped_column(String(100), default="Other")
    company_size: Mapped[int] = mapped_column(Integer, default=1)
    budget: Mapped[float] = mapped_column(Float, default=0)
    timeline: Mapped[str] = mapped_column(String(80), default="Not specified")
    requirement: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(80), default="Website")
    score: Mapped[int] = mapped_column(Integer, default=0)
    classification: Mapped[str] = mapped_column(String(20), default="Cold")
    qualification_reason: Mapped[str] = mapped_column(Text, default="")
    suggested_response: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="New")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
