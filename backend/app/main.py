from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.rental.router import router as rental_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Car Rental Damage Detector", version="2.0.0",
              lifespan=lifespan, redirect_slashes=False)

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(rental_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
