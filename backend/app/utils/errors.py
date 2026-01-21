from fastapi import HTTPException

class AppError(HTTPException):
    pass
