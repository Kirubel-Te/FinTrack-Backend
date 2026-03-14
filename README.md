# FinTrack Backend Project
# FinTrack API

## Overview

FinTrack is a personal finance tracking backend designed to help users manage their income and expenses in a structured way. The system provides secure authentication and will support financial tracking, reporting, and budgeting features.

The project is built as a RESTful API using Node.js and Express, with PostgreSQL as the database and Prisma as the ORM.

---

## Tech Stack

* Node.js
* Express
* PostgreSQL
* Prisma ORM
* JWT Authentication
* bcrypt for password hashing

---

## Current Features (Work in Progress)

### Authentication

* User registration
* User login
* Password hashing with bcrypt
* JWT-based authentication

### Database

* PostgreSQL database initialized
* Prisma ORM configured
* User model created and migrated

### Project Architecture

The backend follows a modular structure separating responsibilities into:

* Routes – API endpoints
* Controllers – request/response handling
* Services – business logic
* Prisma – database access

---

## Project Structure

```
src
│
├── modules
│   └── auth
│       ├── auth.routes.js
│       ├── auth.controller.js
│       └── auth.service.js
│
├── config
│   └── prisma.js
│
├── middlewares
│
├── utils
│
├── app.js
└── server.js
```

---

## Planned Features

* Income tracking
* Expense tracking
* Financial dashboard
* Monthly summaries
* Budget management
* Reporting and analytics

---

## Status

The project is currently in **Phase 1: Core Backend Development**, focusing on authentication and database setup.
