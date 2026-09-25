from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any


app = FastAPI(title="AutoAPI Sentinel AI Service")


# ============================================================
# REQUEST MODEL
# ============================================================

class AnalyzeRequest(BaseModel):

    # --------------------------------------------------------
    # Request information
    # --------------------------------------------------------

    method: str | None = None
    url: str | None = None

    # --------------------------------------------------------
    # Response information
    # --------------------------------------------------------

    statusCode: int | None = None
    responseTime: int
    responseBody: Any = None

    # --------------------------------------------------------
    # Validation rules
    # --------------------------------------------------------

    expectedStatus: int | None = None
    maxResponseTime: int | None = None

    # Expected response structure
    expectedResponseSchema: dict | None = None


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

    response_body = request.responseBody

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
    # 6. RESPONSE SCHEMA VALIDATION
    # ========================================================

    expected_schema = request.expectedResponseSchema

    # Schema validation only makes sense when:
    # 1. A schema was configured
    # 2. API returned a JSON object
    if (
        expected_schema is not None
        and isinstance(response_body, dict)
    ):

        # ----------------------------------------------------
        # Check every expected field
        # ----------------------------------------------------

        for field, expected_value in expected_schema.items():

            # =================================================
            # 6.1 MISSING FIELD
            # =================================================

            if field not in response_body:

                bugDetected = True

                if bugType is None:
                    bugType = "MISSING_FIELD"

                messages.append(
                    f"Expected field '{field}' "
                    f"is missing from response"
                )

                # Continue with next field
                continue

            # ------------------------------------------------
            # Field exists
            # ------------------------------------------------

            actual_value = response_body[field]

            # =================================================
            # 6.2 STRING TYPE VALIDATION
            # =================================================

            if (
                isinstance(expected_value, str)
                and not isinstance(actual_value, str)
            ):

                bugDetected = True

                if bugType is None:
                    bugType = "SCHEMA_MISMATCH"

                messages.append(
                    f"Field '{field}' expected type string "
                    f"but received "
                    f"{type(actual_value).__name__}"
                )

            # =================================================
            # 6.3 INTEGER TYPE VALIDATION
            # =================================================

            elif (
                isinstance(expected_value, int)
                and not isinstance(expected_value, bool)
                and not isinstance(actual_value, int)
            ):

                bugDetected = True

                if bugType is None:
                    bugType = "SCHEMA_MISMATCH"

                messages.append(
                    f"Field '{field}' expected type integer "
                    f"but received "
                    f"{type(actual_value).__name__}"
                )

            # =================================================
            # 6.4 BOOLEAN TYPE VALIDATION
            # =================================================

            elif (
                isinstance(expected_value, bool)
                and not isinstance(actual_value, bool)
            ):

                bugDetected = True

                if bugType is None:
                    bugType = "SCHEMA_MISMATCH"

                messages.append(
                    f"Field '{field}' expected type boolean "
                    f"but received "
                    f"{type(actual_value).__name__}"
                )

            # =================================================
            # 6.5 FLOAT / NUMBER TYPE VALIDATION
            # =================================================

            elif (
                isinstance(expected_value, float)
                and not isinstance(actual_value, (int, float))
            ):

                bugDetected = True

                if bugType is None:
                    bugType = "SCHEMA_MISMATCH"

                messages.append(
                    f"Field '{field}' expected type number "
                    f"but received "
                    f"{type(actual_value).__name__}"
                )

    # ========================================================
    # FINAL MESSAGE
    # ========================================================

    message = ". ".join(messages)

    # If no bug was detected
    if not bugDetected:

        message = (
            "API response passed all configured validations"
        )

    # ========================================================
    # FINAL AI ANALYSIS RESPONSE
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