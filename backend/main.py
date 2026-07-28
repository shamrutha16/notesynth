from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routes import router

app = FastAPI(title="NoteSynth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        # Add your deployed frontend URLs below:
        # "https://your-app.vercel.app",
        # "https://your-hf-username-notesynth-frontend.hf.space",
        "*",  # Remove this wildcard in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
@app.head("/")
async def root():
    """Root endpoint — answers platform health checks on GET and HEAD."""
    return JSONResponse({"status": "ok", "service": "NoteSynth API", "version": "1.0.0"})


@app.get("/health")
@app.head("/health")
async def health():
    """Explicit health check endpoint."""
    return JSONResponse({"status": "healthy"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)
