from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from utils.logger import get_logger

logger = get_logger("error_handler")



def _error_body(status_code: int, message: str, detail: str | None = None) -> dict:
    body = {"status": status_code, "message": message}
    if detail:
        body["detail"] = detail
    return body



async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(
        "HTTP %s on %s %s — %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.status_code, exc.detail),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append({"field": field or "request", "message": err["msg"]})

    logger.warning(
        "Validation error on %s %s — %s",
        request.method,
        request.url.path,
        errors,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Request validation failed.",
            detail=errors,
        ),
    )


async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    logger.error(
        "DB IntegrityError on %s %s — %s",
        request.method,
        request.url.path,
        str(exc.orig),
    )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_error_body(
            status.HTTP_409_CONFLICT,
            "A conflict occurred with existing data.",
        ),
    )


async def operational_error_handler(
    request: Request, exc: OperationalError
) -> JSONResponse:
    logger.critical(
        "DB OperationalError on %s %s — %s",
        request.method,
        request.url.path,
        str(exc.orig),
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=_error_body(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Database is temporarily unavailable. Please try again later.",
        ),
    )


async def sqlalchemy_error_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    logger.error(
        "SQLAlchemyError on %s %s — %s",
        request.method,
        request.url.path,
        str(exc),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An unexpected database error occurred.",
        ),
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An internal server error occurred. Please try again later.",
        ),
    )
