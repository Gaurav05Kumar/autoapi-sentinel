from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AutoAPI Sentinel AI Service")


# ============================================================
# REQUEST MODEL
# ============================================================

class AnalyzeRequest(BaseModel):
    statusCode: int | None = None
    responseTime: int
    responseBody: object | None = None
    expectedStatus: int | None = None
    maxResponseTime: int | None = None


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service"
    }


# ============================================================
# API ANALYSIS
# ============================================================

@app.post("/analyze")
def analyze(request: AnalyzeRequest):

    bugDetected = False
    bugType = None
    message = None

    # Status code check
    if (
        request.expectedStatus is not None
        and request.statusCode != request.expectedStatus
    ):
        bugDetected = True
        bugType = "STATUS_CODE"
        message = (
            f"Expected status {request.expectedStatus} "
            f"but received {request.statusCode}"
        )

    # Response time check
    if (
        request.maxResponseTime is not None
        and request.responseTime > request.maxResponseTime
    ):
        bugDetected = True

        if bugType is None:
            bugType = "RESPONSE_TIME"
            message = (
                f"Response took {request.responseTime}ms, "
                f"maximum allowed is {request.maxResponseTime}ms"
            )
        else:
            message += (
                f". Response took {request.responseTime}ms, "
                f"maximum allowed is {request.maxResponseTime}ms"
            )

    return {
        "bugDetected": bugDetected,
        "bugType": bugType,
        "message": message
    }