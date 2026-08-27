from fastapi import FastAPI

app = FastAPI(title="AutoAPI Sentinel AI Service")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service"
    }