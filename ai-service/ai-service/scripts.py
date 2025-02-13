import uvicorn
import pytest
import flake8


def dev():
    uvicorn.run("ai-service.main:app", host="0.0.0.0", port=8000, reload=True)


def start():
    uvicorn.run("ai-service.main:app", host="0.0.0.0", port=8000)


def test():
    pytest.main()


def lint():
    flake8.main.cli.main(['ai-service'])
