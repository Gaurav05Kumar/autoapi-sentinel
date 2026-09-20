from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any


app = FastAPI(title="AutoAPI Sentinel AI Service")


# ============================================================
# REQUEST MODEL
# ============================================================

class AnalyzeRequest(BaseModel):
    # Request information
    method: str | None = None
    url: str | None = None

    # Response information
    statusCode: int | None = None
    responseTime: int
    responseBody: Any = None

    # Validation rules
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

    # --------------------------------------------------------
    # Default analysis values
    # --------------------------------------------------------

    bugDetected = False
    bugType = None
    messages = []

    # ========================================================
    # 1. STATUS CODE VALIDATION
    # ========================================================

    if (
        request.expectedStatus is not None
        and request.statusCode != request.expectedStatus
    ):
        bugDetected = True

        bugType = "STATUS_CODE"

        messages.append(
            f"Expected status {request.expectedStatus} "
            f"but received {request.statusCode}"
        )

    # ========================================================
    # 2. HTTP ERROR DETECTION
    # ========================================================

    if (
        request.statusCode is not None
        and request.statusCode >= 400
    ):
        bugDetected = True

        # Don't overwrite a more specific STATUS_CODE bug
        if bugType is None:
            bugType = "HTTP_ERROR"

        messages.append(
            f"API returned HTTP error status "
            f"{request.statusCode}"
        )

    # ========================================================
    # 3. RESPONSE TIME VALIDATION
    # ========================================================

    if (
        request.maxResponseTime is not None
        and request.responseTime > request.maxResponseTime
    ):
        bugDetected = True

        if bugType is None:
            bugType = "RESPONSE_TIME"

        messages.append(
            f"Response took {request.responseTime}ms, "
            f"maximum allowed is "
            f"{request.maxResponseTime}ms"
        )

    # ========================================================
    # 4. EMPTY RESPONSE DETECTION
    # ========================================================

    response_body = request.responseBody

    is_empty_response = (
        response_body is None
        or response_body == ""
        or response_body == []
        or response_body == {}
    )

    if is_empty_response:

        bugDetected = True

        if bugType is None:
            bugType = "EMPTY_RESPONSE"

        messages.append(
            "API returned an empty response body"
        )

    # ========================================================
    # 5. INVALID RESPONSE DETECTION
    # ========================================================

    # If the API returns a primitive value instead of a
    # structured JSON object/array, mark it as informational
    # only when the response is otherwise unexpected.
    #
    # We don't automatically mark every string/number as a bug
    # because some APIs legitimately return primitive values.

    if (
        response_body is not None
        and not isinstance(
            response_body,
            (dict, list, str, int, float, bool)
        )
    ):
        bugDetected = True

        if bugType is None:
            bugType = "INVALID_RESPONSE"

        messages.append(
            "API returned an unsupported response format"
        )

    # ========================================================
    # FINAL MESSAGE
    # ========================================================

    message = ". ".join(messages)

    # If no bug was detected, return a clean analysis.
    if not bugDetected:
        message = "API response passed all configured validations"

    # ========================================================
    # FINAL AI ANALYSIS
    # ========================================================

    return {
        "bugDetected": bugDetected,
        "bugType": bugType,
        "message": message,

        # Useful for debugging and future AI expansion
        "analysis": {
            "method": request.method,
            "url": request.url,
            "statusCode": request.statusCode,
            "responseTime": request.responseTime,
        }
    }