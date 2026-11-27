from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder


# =========================================================
# JalRakshak AI - WebSocket Connection Manager
# =========================================================

class ConnectionManager:
    """
    Keeps track of connected React/browser WebSocket clients
    and broadcasts new sensor updates to all of them.
    """

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send one update to every connected client."""

        # Convert datetime/ObjectId and other supported values
        # into JSON-safe Python values before send_json().
        safe_message = jsonable_encoder(message)

        disconnected = []

        for websocket in self.active_connections.copy():
            try:
                await websocket.send_json(safe_message)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()
