# MISAI Backend

This is the backend service for the MISAI project, providing API endpoints for AI model testing and verification.

## Features

- Text verification endpoint (`/testai/{model_name}`)
- Image verification endpoint (`/testimage`)
- Video verification endpoint
- Conversation history support

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Create a `.env` file with your API keys:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Running the Server

Start the FastAPI server with:

```
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

This project uses FastAPI framework with CORS enabled for frontend integration.