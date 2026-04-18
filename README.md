# Project Task Board Application

A full-stack task management application built using **React** (frontend) and **ASP.NET Core Web API** (backend). Users can create projects, manage tasks, and track progress with comments.

---

## Features

- Create and manage projects
- Add, update, and delete tasks
- Task filtering, sorting, and pagination
- Add and delete comments on tasks
- Dashboard with project and task statistics
- SQLite database with persistent storage
- Clean architecture with service layer and DTOs

---

## Tech Stack

### Backend

- ASP.NET Core Web API
- Entity Framework Core
- SQLite

### Frontend

- React (Functional Components + Hooks)
- React Router
- Axios

---

## Project Structure

### Backend (`TaskBoard.Api`)

Controllers/
Services/
Models/
DTOs/
Data/
Migrations/
Program.cs

### Frontend (`task-board-ui`)

hooks/
pages/
services/

## Prerequisites

- .NET SDK (6 or later)
- Node.js (v16+ recommended)
- npm or yarn

---

## Backend Setup

```bash
mkdir TaskBoard.Api
cd TaskBoard.Api

# Install dependencies
dotnet restore

# Apply migrations
dotnet ef database update

# to compile a project
dotnet build

# Run the API
dotnet run

# API will run at: 
https://localhost:5174

# -- Frontend SetUp --

cd task-board-ui

# Install dependencies
npm install

# Start React app
npm start

# App will run at

http://localhost:3000

# Database
SQLite is used as the database

API Endpoints Overview
# Projects
GET /api/projects
POST /api/projects
GET /api/projects/{id}
PUT /api/projects/{id}
DELETE /api/projects/{id}

# Tasks
GET /api/projects/{projectId}/tasks
POST /api/projects/{projectId}/tasks
GET /api/tasks/{id}
PUT /api/tasks/{id}
DELETE /api/tasks/{id}

# Comments
GET /api/tasks/{taskId}/comments
POST /api/tasks/{taskId}/comments
DELETE /api/comments/{id}

##  Backend Dependencies (`TaskBoard.Api.csproj`)
Already inside `.csproj`, but key packages:


Microsoft.EntityFrameworkCore
Microsoft.EntityFrameworkCore.Sqlite
Microsoft.EntityFrameworkCore.Design
Swashbuckle.AspNetCore (Swagger)


---

##  Frontend Dependencies (`package.json`)
```json
{
"dependencies": {
    "axios": "^1.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x"
  }
}
