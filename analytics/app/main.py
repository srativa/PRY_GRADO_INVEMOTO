from fastapi import FastAPI

app = FastAPI(title="INVEMOTO Analytics")

@app.get("/health")
def health():
    return {"status": "ok"}