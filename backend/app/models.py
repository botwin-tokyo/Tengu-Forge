from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    RUNNING = "running"


class ScriptArgument(BaseModel):
    name: str
    label: str
    type: str = "string"  # 'string' | 'bool' | 'enum' | 'int' | etc.
    required: bool = False
    default: Optional[str] = None
    secret: bool = False
    options: Optional[List[str]] = None  # for enum types
    description: Optional[str] = None


class Script(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str = "python"  # 'python' | 'http'

    # Python-specific
    filePath: Optional[str] = None
    workingDirectory: Optional[str] = None
    interpreterVersion: Optional[str] = None  # label for UI
    interpreter: Optional[str] = None         # actual interpreter command

    # HTTP-specific (if you ever treat HTTP as a "script" type)
    httpMethod: Optional[str] = None
    httpUrl: Optional[str] = None
    httpHeaders: Optional[Dict[str, str]] = None
    httpBody: Optional[str] = None

    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    allowedEnv: List[str] = Field(default_factory=list)
    dangerous: bool = False
    arguments: List[ScriptArgument] = Field(default_factory=list)


class RunResult(BaseModel):
    id: str
    scriptId: str
    status: RunStatus
    stdout: str
    stderr: str
    startTime: str  # ISO-8601
    duration: int   # seconds
    exitCode: int
    arguments: Dict[str, object] = Field(default_factory=dict)
    envOverrides: Dict[str, str] = Field(default_factory=dict)


class HeaderKV(BaseModel):
    key: str
    value: str


class HTTPAction(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    method: str
    url: str
    headers: List[HeaderKV] = Field(default_factory=list)
    queryParams: List[HeaderKV] = Field(default_factory=list)
    body: Optional[str] = None
    createdAt: str  # ISO-8601


class HTTPActionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    method: str
    url: str
    headers: List[HeaderKV] = Field(default_factory=list)
    queryParams: List[HeaderKV] = Field(default_factory=list)
    body: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = "ok"
