from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any


app = FastAPI(title="AutoAPI Sentinel AI Service")


# ============================================================
# REQUEST MODEL
# ============================================================

class AnalyzeRequest(BaseModel):

    method: str | None = None
    url: str | None = None

    statusCode: int | None = None
    responseTime: int

    responseBody: Any = None

    expectedStatus: int | None = None
    maxResponseTime: int | None = None

    expectedResponseSchema: dict | None = None


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "ai-service",
    }


# ============================================================
# TYPE NAME
# ============================================================

def get_type_name(value: Any) -> str:

    if value is None:
        return "null"

    if isinstance(value, bool):
        return "boolean"

    if isinstance(value, int):
        return "integer"

    if isinstance(value, float):
        return "number"

    if isinstance(value, str):
        return "string"

    if isinstance(value, list):
        return "array"

    if isinstance(value, dict):
        return "object"

    return type(value).__name__


# ============================================================
# EXPECTED TYPE VALIDATION
# ============================================================

def is_expected_type(
    actual_value: Any,
    expected_value: Any,
) -> bool:

    # --------------------------------------------------------
    # Schema type is provided as a string
    #
    # Example:
    # "id": "integer"
    # "name": "string"
    # "active": "boolean"
    # --------------------------------------------------------

    if isinstance(expected_value, str):

        expected_type = expected_value.lower().strip()

        # STRING
        if expected_type == "string":
            return isinstance(actual_value, str)

        # INTEGER
        if expected_type == "integer":
            return (
                isinstance(actual_value, int)
                and not isinstance(actual_value, bool)
            )

        # NUMBER
        if expected_type == "number":
            return (
                isinstance(actual_value, (int, float))
                and not isinstance(actual_value, bool)
            )

        # FLOAT
        if expected_type == "float":
            return (
                isinstance(actual_value, float)
                and not isinstance(actual_value, bool)
            )

        # BOOLEAN
        if expected_type == "boolean":
            return isinstance(actual_value, bool)

        # OBJECT
        if expected_type == "object":
            return isinstance(actual_value, dict)

        # ARRAY
        if expected_type == "array":
            return isinstance(actual_value, list)

        # NULL
        if expected_type == "null":
            return actual_value is None

        # Unknown schema type
        return False

    # --------------------------------------------------------
    # Nested object schema
    # --------------------------------------------------------

    if isinstance(expected_value, dict):

        return isinstance(actual_value, dict)

    # --------------------------------------------------------
    # Array schema
    # --------------------------------------------------------

    if isinstance(expected_value, list):

        return isinstance(actual_value, list)

    # --------------------------------------------------------
    # Direct boolean schema
    # --------------------------------------------------------

    if isinstance(expected_value, bool):

        return isinstance(actual_value, bool)

    # --------------------------------------------------------
    # Direct integer schema
    # --------------------------------------------------------

    if isinstance(expected_value, int):

        return (
            isinstance(actual_value, int)
            and not isinstance(actual_value, bool)
        )

    # --------------------------------------------------------
    # Direct float schema
    # --------------------------------------------------------

    if isinstance(expected_value, float):

        return (
            isinstance(actual_value, (int, float))
            and not isinstance(actual_value, bool)
        )

    # --------------------------------------------------------
    # Null
    # --------------------------------------------------------

    if expected_value is None:

        return actual_value is None

    return False


# ============================================================
# RECURSIVE SCHEMA VALIDATOR
# ============================================================

def validate_schema(
    expected_schema: dict,
    actual_response: dict,
    path: str = "",
) -> list[dict]:

    errors = []

    # ========================================================
    # CHECK EACH EXPECTED FIELD
    # ========================================================

    for field, expected_value in expected_schema.items():

        field_path = (
            f"{path}.{field}"
            if path
            else field
        )

        # ====================================================
        # MISSING FIELD
        # ====================================================

        if field not in actual_response:

            errors.append({
                "type": "MISSING_FIELD",
                "message": (
                    f"Required field '{field_path}' "
                    f"is missing from response"
                ),
            })

            continue

        actual_value = actual_response[field]

        # ====================================================
        # TYPE MISMATCH
        # ====================================================

        if not is_expected_type(
            actual_value,
            expected_value,
        ):

            errors.append({
                "type": "SCHEMA_MISMATCH",
                "message": (
                    f"Field '{field_path}' expected type "
                    f"{expected_value} "
                    f"but received "
                    f"{get_type_name(actual_value)}"
                ),
            })

            continue

        # ====================================================
        # NESTED OBJECT
        # ====================================================

        if (
            isinstance(expected_value, dict)
            and isinstance(actual_value, dict)
        ):

            nested_errors = validate_schema(
                expected_value,
                actual_value,
                field_path,
            )

            errors.extend(nested_errors)

        # ====================================================
        # ARRAY
        # ====================================================

        elif (
            isinstance(expected_value, list)
            and isinstance(actual_value, list)
        ):

            # Empty array means only check array type
            if len(expected_value) == 0:
                continue

            expected_item_schema = expected_value[0]

            for index, actual_item in enumerate(
                actual_value
            ):

                item_path = (
                    f"{field_path}[{index}]"
                )

                # --------------------------------------------
                # ARRAY ITEM TYPE
                # --------------------------------------------

                if not is_expected_type(
                    actual_item,
                    expected_item_schema,
                ):

                    errors.append({
                        "type": "SCHEMA_MISMATCH",
                        "message": (
                            f"Field '{item_path}' "
                            f"expected type "
                            f"{expected_item_schema} "
                            f"but received "
                            f"{get_type_name(actual_item)}"
                        ),
                    })

                    continue

                # --------------------------------------------
                # ARRAY OF OBJECTS
                # --------------------------------------------

                if (
                    isinstance(
                        expected_item_schema,
                        dict,
                    )
                    and isinstance(
                        actual_item,
                        dict,
                    )
                ):

                    nested_errors = validate_schema(
                        expected_item_schema,
                        actual_item,
                        item_path,
                    )

                    errors.extend(
                        nested_errors
                    )

    return errors


# ============================================================
# API ANALYSIS
# ============================================================

@app.post("/analyze")
def analyze(request: AnalyzeRequest):

    bugDetected = False

    bugType = None

    messages = []

    response_body = request.responseBody

    # ========================================================
    # 1. STATUS CODE
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
    # 2. HTTP ERROR
    # ========================================================

    if (
        request.statusCode is not None
        and request.statusCode >= 400
    ):

        bugDetected = True

        if bugType is None:
            bugType = "HTTP_ERROR"

        messages.append(
            f"API returned HTTP error status "
            f"{request.statusCode}"
        )

    # ========================================================
    # 3. RESPONSE TIME
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
    # 4. EMPTY RESPONSE
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
    # 5. INVALID RESPONSE
    # ========================================================

    if (
        response_body is not None
        and not isinstance(
            response_body,
            (
                dict,
                list,
                str,
                int,
                float,
                bool,
            ),
        )
    ):

        bugDetected = True

        if bugType is None:
            bugType = "INVALID_RESPONSE"

        messages.append(
            "API returned an unsupported response format"
        )

    # ========================================================
    # 6. RESPONSE SCHEMA
    # ========================================================

    expected_schema = request.expectedResponseSchema

    if expected_schema is not None:

        # ----------------------------------------------------
        # Schema exists but response is not an object
        # ----------------------------------------------------

        if not isinstance(response_body, dict):

            bugDetected = True

            if bugType is None:
                bugType = "SCHEMA_MISMATCH"

            messages.append(
                "Expected response to be an object "
                "for schema validation"
            )

        else:

            schema_errors = validate_schema(
                expected_schema,
                response_body,
            )

            for error in schema_errors:

                bugDetected = True

                if bugType is None:
                    bugType = error["type"]

                messages.append(
                    error["message"]
                )

    # ========================================================
    # FINAL MESSAGE
    # ========================================================

    if not bugDetected:

        message = (
            "API response passed all configured validations"
        )

    else:

        message = ". ".join(messages)

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "bugDetected": bugDetected,

        "bugType": bugType,

        "message": message,

        "analysis": {

            "method": request.method,

            "url": request.url,

            "statusCode": request.statusCode,

            "responseTime": request.responseTime,

            "expectedResponseSchema":
                request.expectedResponseSchema,

        },
    }