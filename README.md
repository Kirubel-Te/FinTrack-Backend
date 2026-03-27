# FinTrack API Backend

REST API for personal finance management with authentication, transaction tracking, reporting, and budgeting.

## Features

- JWT authentication with refresh token rotation
- Income CRUD with filters and pagination
- Expense CRUD with filters and pagination
- Financial reports (summary, monthly summary, category aggregation)
- Budget CRUD and budget vs spending summary
- Input validation using Zod
- Global error handling with consistent error shape

## Tech Stack

- Node.js + Express
- PostgreSQL
- Prisma ORM
- Zod validation
- JWT + bcrypt
- Vitest + Supertest

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

3. Required environment variables

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PORT=3000

JWT_SECRET=your_access_secret
JWT_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_TTL_DAYS=7
```

4. Run migrations

```bash
npx prisma migrate dev
```

5. Start server

```bash
npm run dev
```

Base URL (local):

```text
http://localhost:3000
```

Health check:

```http
GET /
```

## Authentication Model

- Protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

- Refresh token can be provided either:
	- In body as refreshToken
	- Or in Authorization header as Bearer refreshToken

## API Response Conventions

Successful responses:

- Most modules use:

```json
{
	"success": true,
	"data": {}
}
```

- Auth register/login/me return direct payload (without success wrapper).

Error responses are centralized and always follow:

```json
{
	"success": false,
	"message": "Error message"
}
```

## Frontend Integration Flow

1. Register or login.
2. Save accessToken and refreshToken securely.
3. Send access token in Authorization header for protected APIs.
4. If request returns 401, call refresh endpoint and retry with new access token.
5. On logout, call logout endpoint with refresh token and clear local session.

Example Axios interceptor strategy:

```js
import axios from "axios";

const api = axios.create({
	baseURL: "http://localhost:3000/api/v1"
});

api.interceptors.request.use((config) => {
	const accessToken = localStorage.getItem("accessToken");
	if (accessToken) {
		config.headers.Authorization = `Bearer ${accessToken}`;
	}
	return config;
});

api.interceptors.response.use(
	(res) => res,
	async (error) => {
		const original = error.config;
		if (error.response?.status === 401 && !original._retry) {
			original._retry = true;
			const refreshToken = localStorage.getItem("refreshToken");

			const refreshRes = await axios.post(
				"http://localhost:3000/api/v1/auth/refresh",
				{ refreshToken }
			);

			const newAccess = refreshRes.data.data.accessToken;
			const newRefresh = refreshRes.data.data.refreshToken;

			localStorage.setItem("accessToken", newAccess);
			localStorage.setItem("refreshToken", newRefresh);

			original.headers.Authorization = `Bearer ${newAccess}`;
			return axios(original);
		}

		return Promise.reject(error);
	}
);

export default api;
```

## API Endpoints

### Auth

The API currently exposes auth  path:

- /api/v1/auth

Use /api/v1/auth for consistency.

#### POST /api/v1/auth/register

Request:

```json
{
	"firstName": "John",
	"lastName": "Doe",
	"email": "john@example.com",
	"password": "secret123"
}
```

Validation:

- firstName required non-empty string
- lastName required non-empty string
- email valid email
- password min 6 chars

Response:

```json
{
	"user": {
		"id": "...",
		"firstName": "John",
		"lastName": "Doe",
		"email": "john@example.com",
		"createdAt": "2026-03-27T12:00:00.000Z"
	},
	"accessToken": "...",
	"refreshToken": "..."
}
```

#### POST /api/v1/auth/login

Request:

```json
{
	"email": "john@example.com",
	"password": "secret123"
}
```

Response:

```json
{
	"user": {
		"id": "...",
		"firstName": "John",
		"lastName": "Doe",
		"email": "john@example.com",
		"createdAt": "2026-03-27T12:00:00.000Z"
	},
	"accessToken": "...",
	"refreshToken": "..."
}
```

#### POST /api/v1/auth/refresh

Request:

```json
{
	"refreshToken": "..."
}
```

Response:

```json
{
	"success": true,
	"data": {
		"accessToken": "...",
		"refreshToken": "..."
	}
}
```

#### POST /api/v1/auth/logout

Request:

```json
{
	"refreshToken": "..."
}
```

Response:

```json
{
	"success": true,
	"data": {
		"message": "Logged out successfully"
	}
}
```

#### GET /api/v1/auth/me

Protected: Yes

Response:

```json
{
	"id": "...",
	"firstName": "John",
	"lastName": "Doe",
	"email": "john@example.com",
	"createdAt": "2026-03-27T12:00:00.000Z"
}
```

### Incomes

Base path: /api/v1/incomes
Protected: Yes

#### POST /

Request:

```json
{
	"amount": 1200.5,
	"category": "salary",
	"date": "2026-03-27",
	"description": "March salary"
}
```

Validation:

- amount positive number
- category non-empty string
- date valid date
- description optional string or null

#### GET /

Query params:

- page (positive integer, default 1)
- limit (positive integer, default 10, max 100)
- category (optional)
- startDate (optional valid date)
- endDate (optional valid date)

Response:

```json
{
	"success": true,
	"data": [],
	"meta": {
		"page": 1,
		"limit": 10,
		"total": 25,
		"totalPages": 3
	}
}
```

#### GET /:id

Path param:

- id must be UUID

#### PATCH /:id

Path param:

- id must be UUID

Request body:

- any subset of amount/category/date/description
- at least one field required

#### DELETE /:id

Path param:

- id must be UUID

### Expenses

Base path: /api/v1/expenses
Protected: Yes

Endpoints and validation match income module:

- POST /
- GET /
- GET /:id
- PATCH /:id
- DELETE /:id

### Reports

Base path: /api/v1/reports
Protected: Yes

#### GET /summary

Response:

```json
{
	"success": true,
	"data": {
		"totalIncome": 5000,
		"totalExpense": 3200,
		"balance": 1800
	}
}
```

#### GET /monthly?month=YYYY-MM

Validation:

- month required
- format YYYY-MM

Response:

```json
{
	"success": true,
	"data": {
		"month": "2026-03",
		"totalIncome": 2000,
		"totalExpense": 1500,
		"balance": 500
	}
}
```

#### GET /categories

Response:

```json
{
	"success": true,
	"data": [
		{ "category": "food", "total": 300 },
		{ "category": "transport", "total": 120 }
	]
}
```

### Budgets

Base path: /api/v1/budgets
Protected: Yes

#### POST /

Request:

```json
{
	"amount": 2000,
	"period": "monthly",
	"category": null
}
```

Validation:

- amount positive number
- period currently supports monthly
- category optional (null means global budget)

#### GET /

Optional query params:

- period=monthly
- category=food or category=null by omission

#### PATCH /:id

Path param:

- id must be UUID

Request body:

- any subset of amount/period/category
- at least one field required

#### DELETE /:id

Path param:

- id must be UUID

#### GET /summary

Optional query params:

- period (default monthly)
- category (optional)

Response:

```json
{
	"success": true,
	"data": {
		"budget": 2000,
		"spent": 1500,
		"remaining": 500,
		"usage": 75,
		"status": "within_budget",
		"period": "monthly",
		"category": null
	}
}
```

Budget status values:

- usage < 80: within_budget
- 80 <= usage < 100: warning
- usage >= 100: overspent

## Ownership and Security

- All protected resources are scoped to the authenticated user.
- Server-side queries enforce user ownership.
- One user cannot read/update/delete another user data.

## Validation Rules Summary

- UUID params are enforced for transaction and budget ids.
- Pagination:
	- page positive integer
	- limit positive integer, capped at 100
- Date filters:
	- startDate and endDate must be valid
	- startDate cannot be greater than endDate
- Monthly reports:
	- month must match YYYY-MM

## Common Error Cases for Frontend Handling

- 400: validation errors or invalid request
- 401: invalid/expired token, invalid credentials, invalid refresh token
- 404: resource not found
- 409: duplicate resource conflict (example: duplicate budget config)
- 500: internal server error

Suggested frontend behavior:

- On 401 from protected endpoints, try refresh once, then force logout.
- Show API message directly for 400 and 409.
- For 500, show generic fallback UI message.

## Development Commands

```bash
npm run dev
npm start
npm test
```
