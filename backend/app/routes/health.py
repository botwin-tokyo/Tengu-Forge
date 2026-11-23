from fastapi import APIRouter, Depends

from ..dependencies import verify_api_key
from ..models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(_: None = Depends(verify_api_key)):
    return HealthResponse()
