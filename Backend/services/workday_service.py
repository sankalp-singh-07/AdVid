# TODO for Developer 2
# 1. Import requests or aiohttp for Workday API calls

async def query_workday(nl_query: str):
    """
    Convert Natural Language into a structured Workday request.
    
    Steps to implement:
    1. Pass `nl_query` to an Ollama prompt that outputs a structured JSON query (or WQL).
    2. Authenticate and send request to Workday API endpoint.
    3. Parse Workday response and format it cleanly for the frontend UI.
    """
    pass
