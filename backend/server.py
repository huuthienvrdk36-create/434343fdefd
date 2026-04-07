from fastapi import FastAPI, APIRouter, Request, Response, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import subprocess
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'auto_platform')]

# Create the main app
app = FastAPI()

# NestJS backend URL
NESTJS_URL = "http://localhost:3001"

# NestJS process management
nestjs_process: Optional[subprocess.Popen] = None

async def build_nestjs():
    """Build NestJS backend"""
    try:
        logging.info("Building NestJS backend...")
        
        # Check if dist folder exists
        dist_path = ROOT_DIR / 'dist'
        main_path = dist_path / 'main.js'
        
        if not main_path.exists():
            # Run npm build
            build_process = subprocess.run(
                ['npm', 'run', 'build'],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if build_process.returncode != 0:
                logging.error(f"NestJS build failed: {build_process.stderr}")
                return False
                
            logging.info("NestJS build completed successfully")
        
        return True
    except Exception as e:
        logging.error(f"Failed to build NestJS: {e}")
        return False

async def start_nestjs():
    """Start NestJS backend in background"""
    global nestjs_process
    
    try:
        # Check if already running
        async with httpx.AsyncClient() as http:
            try:
                response = await http.get(f"{NESTJS_URL}/api/services/categories", timeout=2.0)
                if response.status_code < 500:
                    logging.info("NestJS is already running")
                    return True
            except:
                pass
        
        # Build first if needed
        built = await build_nestjs()
        if not built:
            logging.warning("NestJS build failed, trying to start anyway...")
        
        logging.info("Starting NestJS backend...")
        
        # Start NestJS on port 3001
        env = os.environ.copy()
        env['PORT'] = '3001'
        
        nestjs_process = subprocess.Popen(
            ['node', 'dist/main.js'],
            cwd=ROOT_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        # Wait for NestJS to be ready
        for i in range(60):
            await asyncio.sleep(1)
            try:
                async with httpx.AsyncClient() as http:
                    response = await http.get(f"{NESTJS_URL}/api/services/categories", timeout=2.0)
                    if response.status_code < 500:
                        logging.info("NestJS backend started successfully")
                        return True
            except:
                # Check if process is still running
                if nestjs_process.poll() is not None:
                    stdout, stderr = nestjs_process.communicate()
                    logging.error(f"NestJS crashed: {stderr.decode()}")
                    return False
        
        logging.warning("NestJS startup timeout")
        return False
        
    except Exception as e:
        logging.error(f"Failed to start NestJS: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Start NestJS on FastAPI startup"""
    asyncio.create_task(start_nestjs())

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global nestjs_process
    client.close()
    
    if nestjs_process:
        nestjs_process.terminate()
        try:
            nestjs_process.wait(timeout=5)
        except:
            nestjs_process.kill()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# HTTP client for proxying
http_client = httpx.AsyncClient(timeout=30.0)

# Proxy all /api/* requests to NestJS
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_to_nestjs(request: Request, path: str):
    """Proxy all API requests to NestJS backend"""
    
    # Build target URL
    target_url = f"{NESTJS_URL}/api/{path}"
    
    # Get query params
    if request.query_params:
        target_url += f"?{request.query_params}"
    
    # Get headers (excluding host)
    headers = dict(request.headers)
    headers.pop('host', None)
    headers.pop('content-length', None)
    
    # Get body
    body = await request.body()
    
    try:
        # Make request to NestJS
        response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )
        
        # Build response headers
        response_headers = dict(response.headers)
        response_headers.pop('content-length', None)
        response_headers.pop('content-encoding', None)
        response_headers.pop('transfer-encoding', None)
        
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get('content-type', 'application/json'),
        )
        
    except httpx.ConnectError:
        # NestJS not ready yet - try to start it
        asyncio.create_task(start_nestjs())
        raise HTTPException(
            status_code=503,
            detail="Backend is starting up, please try again in a few seconds"
        )
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    nestjs_healthy = False
    
    try:
        response = await http_client.get(f"{NESTJS_URL}/api/services/categories", timeout=2.0)
        nestjs_healthy = response.status_code < 500
    except:
        pass
    
    return {
        "status": "ok",
        "nestjs": "healthy" if nestjs_healthy else "starting",
        "timestamp": datetime.utcnow().isoformat()
    }
