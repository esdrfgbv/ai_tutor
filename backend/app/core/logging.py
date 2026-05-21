import json
import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("preporbit")
logger.setLevel(logging.DEBUG)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract request info
        request_id = id(request)
        method = request.method
        path = request.url.path
        query = request.url.query
        
        # Log request start
        logger.info(f"[{request_id}] → {method} {path}{'?' + query if query else ''}")
        
        # Add request start time
        request.state.start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - request.state.start_time
            
            # Log response
            logger.info(
                f"[{request_id}] ← {response.status_code} ({duration:.2f}s) {method} {path}"
            )
            
            # Add X-Process-Time header
            response.headers["X-Process-Time"] = str(duration)
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = time.time() - request.state.start_time
            
            # Log error
            logger.error(
                f"[{request_id}] ✗ ERROR ({duration:.2f}s) {method} {path}: {str(e)}",
                exc_info=True
            )
            
            raise


class ErrorResponseLogger:
    """Helper to log detailed error responses"""
    
    @staticmethod
    def log_validation_error(errors):
        """Log pydantic validation errors"""
        logger.warning(f"Validation error: {json.dumps(errors, indent=2)}")
    
    @staticmethod
    def log_database_error(error):
        """Log database-related errors"""
        logger.error(f"Database error: {str(error)}", exc_info=True)
    
    @staticmethod
    def log_auth_error(reason):
        """Log authentication failures"""
        logger.warning(f"Authentication failed: {reason}")
    
    @staticmethod
    def log_permission_error(reason):
        """Log authorization failures"""
        logger.warning(f"Authorization failed: {reason}")


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module"""
    return logging.getLogger(name)
