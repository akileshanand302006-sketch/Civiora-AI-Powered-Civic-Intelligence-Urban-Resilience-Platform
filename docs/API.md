# CivicPulse — API Reference Manual (v1)

> **Base URL**: `/api/v1`  
> **WebSocket Gateway**: `/socket.io/`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register`
Self-service citizen registration.
```json
// Request Body
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "email": "priya@example.com",
  "password": "Password@123",
  "phone": "+91 98765 43210",
  "organizationSlug": "metropolis"
}
```

### `POST /auth/login`
Authenticates a user and returns access and refresh tokens.
```json
// Request Body
{
  "email": "priya@example.com",
  "password": "Password@123",
  "organizationSlug": "metropolis"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "user": {
      "id": "66f7f2b1...",
      "email": "priya@example.com",
      "role": "citizen"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "78abcf3...",
      "expiresIn": 900
    }
  }
}
```

### `POST /auth/refresh`
Rotates refresh tokens and issues fresh access tokens.

---

## 2. Incident Management Endpoints (`/api/v1/incidents`)

### `POST /incidents`
Reports a new civic incident with coordinates, category, and evidence.
- **Headers**: `Authorization: Bearer <token>`
```json
// Request Body
{
  "category": "pothole",
  "title": "Severe asphalt cavity on 5th Cross Road",
  "description": "Pothole deep enough to cause vehicular undercarriage damage.",
  "isEmergency": false,
  "location": {
    "coordinates": [77.5946, 12.9716],
    "address": "5th Cross Road, Sector 3, Metropolis"
  },
  "reportingMode": "standard"
}
```

### `GET /incidents`
Lists paginated incidents with filtering.
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
  - `category`: string
  - `status`: string (`reported`, `verified`, `assigned`, `in_progress`, `resolved`)
  - `priority`: string (`low`, `medium`, `high`, `critical`)
  - `isEmergency`: boolean
  - `search`: string (text search across title and address)

### `GET /incidents/nearby`
Geospatial query locating incidents near a geographic point.
- **Query Parameters**:
  - `lng`: float (e.g. 77.5946)
  - `lat`: float (e.g. 12.9716)
  - `radiusMeters`: integer (default: 5000)

### `PATCH /incidents/:id/status`
Advances incident status according to the valid state machine.
- **Required Roles**: `officer`, `field_worker`, `manager`, `tenant_admin`, `system_admin`
```json
{
  "status": "in_progress",
  "notes": "Crew dispatched with hot-mix asphalt batch"
}
```

### `POST /incidents/:id/assign`
Assigns incident to a designated field worker or officer.

### `POST /incidents/:id/resolve`
Marks incident as resolved with notes and optional resolution evidence photos.

---

## 3. Real-Time WebSocket Events

| Event Name | Direction | Payload Description |
|---|---|---|
| `incident:created` | Server → Client | Emitted to `org:{orgId}` when any citizen files a report |
| `incident:statusChanged`| Server → Client | Emitted to `incident:{id}` and `org:{orgId}` on state transitions |
| `incident:assigned` | Server → Client | Emitted to target user `user:{userId}` when task is assigned |
| `emergency:alert` | Server → Client | Broadcast to emergency operators on SOS flags |
| `map:incident:add` | Server → Client | Emitted to live city map viewers with fuzzed public coordinates |
