from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/workday", tags=["Workday"])

class WorkdayQueryRequest(BaseModel):
    nl_query: str

@router.post("/query")
async def execute_workday_query(request: WorkdayQueryRequest):
    """
    Convert Natural Language to a Workday query and fetch data.
    TODO for Developer 2:
    - Use Ollama to parse intent from nl_query
    - Formulate WQL or REST request to Workday API
    - Return structured JSON data for the frontend
    """
    return {
        "results": [
            {"id": "WD-1042", "name": "Sarah Jenkins", "department": "Engineering"}
        ]
    }
