# app.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
import os
import httpx
import asyncio
from typing import Optional
import logging
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Reality Defender - FastAPI wrapper")

REALITY_API_KEY = os.getenv("REALITY_API_KEY")
REALITY_BASE = os.getenv("REALITY_BASE", "https://api.prd.realitydefender.xyz")

HEADERS = {
    "X-API-KEY": REALITY_API_KEY,
    "Content-Type": "application/json"
}


app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PresignResponse(BaseModel):
    signedUrl: Optional[str] = None
    requestId: Optional[str] = None


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    try_fetch_result: bool = Query(False, description="If true, attempt to fetch analysis result after upload"),
    fetch_timeout: int = Query(5, description="Seconds to wait when try_fetch_result=True (total polling time)"),
    debug: bool = Query(False, description="If true, return raw presign JSON for debugging")
):
    filename = file.filename or "upload.bin"
    presign_payload = {"fileName": filename}
    presign_url = f"{REALITY_BASE}/api/files/aws-presigned"

    async with httpx.AsyncClient(timeout=15) as client:
        # STEP 1: Request presigned URL
        presign_resp = await client.post(presign_url, json=presign_payload, headers=HEADERS)

        # accept any 2xx as success
        if presign_resp.status_code < 200 or presign_resp.status_code >= 300:
            # surface body for debugging
            raise HTTPException(status_code=502, detail=f"Failed to get presigned URL: status={presign_resp.status_code} body={presign_resp.text}")

        # Parse JSON safely
        try:
            presign_full = presign_resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Presign response not JSON: {e} body={presign_resp.text}")

        # Optional: expose raw presign body in debug mode so you can inspect it from the client
        if debug:
            return {"presign_status": presign_resp.status_code, "presign_body": presign_full}

        logger.info("Presign response JSON: %s", presign_full)

        # Common candidate containers to search for fields
        candidates = []
        if isinstance(presign_full, dict):
            candidates.append(presign_full)
            for key in ("response", "data", "result"):
                v = presign_full.get(key)
                if isinstance(v, dict):
                    candidates.append(v)

        signed_url = None
        request_id = None

        # try common key names and casings
        for c in candidates:
            for key in ("signedUrl", "signed_url", "signedURL", "uploadUrl", "url"):
                if key in c:
                    signed_url = c.get(key)
                    break
            for key in ("requestId", "request_id", "requestID", "id"):
                if key in c:
                    request_id = c.get(key)
                    break
            if signed_url and request_id:
                break

        # Helpful error if missing
        if not signed_url or not request_id:
            # Return the whole presign response to help you see where the fields are located
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Presign response missing signedUrl or requestId (checked common keys).",
                    "checked_candidates": candidates,
                    "full_response": presign_full
                }
            )

        # STEP 2: Upload file bytes
        file_bytes = await file.read()
        upload_resp = await client.put(signed_url, content=file_bytes, timeout=20)

        if upload_resp.status_code not in (200, 201, 204):
            raise HTTPException(status_code=502, detail=f"Upload failed: status {upload_resp.status_code} body: {upload_resp.text}")

        result_payload = {"requestId": request_id, "uploadStatus": upload_resp.status_code}

        # STEP 3: Optionally attempt to fetch analysis result (short poll)
        if try_fetch_result:
            check_url = f"{REALITY_BASE}/api/media/users/{request_id}"
            deadline = asyncio.get_event_loop().time() + max(0, fetch_timeout)
            analysis = None
            while asyncio.get_event_loop().time() < deadline:
                get_resp = await client.get(check_url, headers=HEADERS)
                if get_resp.status_code == 200:
                    analysis = get_resp.json()
                    break
                await asyncio.sleep(1)
            result_payload["analysis"] = analysis

        return result_payload



@app.get("/result/{request_id}")
async def get_deepfake_result(request_id: str):
    """
    Fetch ONLY deepfake-related analysis results for an image.
    """
    url = f"{REALITY_BASE}/api/media/users/{request_id}"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, headers=HEADERS)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to fetch result: {resp.text}"
            )

        data = resp.json()

        # Filter ONLY deepfake image models
        DEEPFAKE_IMAGE_MODELS = {
            "rd-context-img",
            "rd-pine-img",
            "rd-img-ensemble",
            "rd-cedar-img",
            "rd-elm-img",
            "rd-oak-img"
        }

        deepfake_models = []
        for model in data.get("models", []):
            if model.get("name") in DEEPFAKE_IMAGE_MODELS:
                deepfake_models.append({
                    "name": model.get("name"),
                    "status": model.get("status"),
                    "score": model.get("predictionNumber"),
                    "finalScore": model.get("finalScore"),
                    "normalizedScore": model.get("normalizedPredictionNumber"),
                })

        return {
            "requestId": data.get("requestId"),
            "overallStatus": data.get("overallStatus"),
            "resultsSummary": data.get("resultsSummary"),
            "deepfakeModels": deepfake_models
        }