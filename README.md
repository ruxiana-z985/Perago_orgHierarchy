# Perago Org Chart API

> REST API for managing an organizational position hierarchy with direct CRUD operations

![NestJS](https://img.shields.io/badge/NestJS-8.x-red)  
![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-blue)  
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)

---

## Overview

The **Perago Org Chart API** is a NestJS-based REST API that manages an organizational position hierarchy. It provides direct CRUD operations for creating, reading, updating, and deleting positions with built-in business rule validation.

### Key Features

- 📊 **Position Hierarchy** — Browse and manage the org chart in flat or tree format  
- ✏️ **Direct CRUD** — Create, update, and delete positions immediately  
- 🌳 **Tree Operations** — Materialized paths, depth tracking, descendant counting  
- 🔒 **Security** — Helmet, CORS, and rate limiting  
- 📚 **Swagger UI** — Interactive API documentation at `/api`  
- 🚀 **Live Deployment** — Running on Render  

---

## Quick Start

### Prerequisites

- Node.js 20.x  
- PostgreSQL 14+  
- npm  

### Installation

```bash
git clone <repository-url>
cd perago-nestjs-api

npm install
cp .env.example .env
# Edit .env with your database credentials

npm run start:dev
```

### Access the API

| Service       | URL                          |
|--------------|------------------------------|
| API Base     | http://localhost:3000        |
| Swagger UI   | http://localhost:3000/api    |
| Health Check | http://localhost:3000/health |

---

## Architecture

```
src/
├── domain/
├── application/
├── infrastructure/
└── interface/
```

---

## API Endpoints

### Health Check

GET /health

### Positions

GET /positions  
POST /positions  
PATCH /positions/:id  
DELETE /positions/:id  

---

## Configuration

See `.env` file for environment variables.

---

