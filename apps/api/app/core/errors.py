"""One error shape for the whole API: { code, message, field? } (ARCHITECTURE.md §13).

Messages follow DESIGN.md copy rules: say what happened, then what to do.
They never contain patient data.
"""

import logging
import secrets

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")


class AppError(Exception):
    """An expected failure a person can act on. Raised by services, rendered by the handler."""

    def __init__(self, status_code: int, code: str, message: str, field: str | None = None):
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field = field


def _body(code: str, message: str, field: str | None = None) -> dict[str, str]:
    body = {"code": code, "message": message}
    if field is not None:
        body["field"] = field
    return body


async def _app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)  # noqa: S101  # registered for AppError only
    return JSONResponse(_body(exc.code, exc.message, exc.field), status_code=exc.status_code)


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    first = exc.errors()[0]
    location = [str(part) for part in first.get("loc", ()) if part != "body"]
    field = location[-1] if location else None
    message = f"Check {field.replace('_', ' ')}." if field else "Check the request."
    return JSONResponse(_body("validation_error", message, field), status_code=422)


async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    # The reference lets support find the log line; the response reveals nothing else.
    reference = secrets.token_hex(4)
    logger.exception("Unhandled error (reference %s)", reference, exc_info=exc)
    message = f"Something went wrong on our side. Try again. Reference: {reference}."
    return JSONResponse(_body("internal_error", message), status_code=500)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unexpected_error)
