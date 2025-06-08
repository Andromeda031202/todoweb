# Task Management System

A full-stack task management application with MongoDB backend and React frontend.

## Features

- User authentication with JWT
- Project management
- Task management with assignment to users and projects
- Dashboard views for tasks and projects

## Prerequisites

- .NET 7.0 or higher
- Node.js 16.0 or higher
- MongoDB (local or Atlas connection)

## Setup Instructions

### 1. Configuration

The application uses MongoDB for data storage. Make sure your connection string is properly configured in:
- `TodoApp.Api/appsettings.json`

### 2. Running the Application

#### Easy Method (Recommended)

Use the provided scripts to run both the frontend and backend:

**For PowerShell users:**
```
# If you encounter issues with run-app.ps1, use:
.\start-app.ps1

# Or run each component separately:
.\run-backend.ps1  # Start just the backend
.\run-frontend.ps1 # Start just the frontend
```

**For Command Prompt users:**
```
# If you encounter issues with run-app.bat, use:
start-app.bat
```

These scripts will start both the backend and frontend applications in separate terminal windows.

#### Manual Method

If the scripts don't work, you can start the applications manually:

**Backend (API):**
```
cd TodoApp.Api
dotnet run
```

**Frontend:**
```
cd frontend
npm run dev
```

### 3. Accessing the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:7070

## Default Credentials

- Email: admin123@gmail.com
- Password: admin123

## Troubleshooting

If you encounter any issues:

1. Make sure MongoDB is running and accessible
2. Check that the correct ports (5002 for API, 5173 for frontend) are available
3. Verify that all required dependencies are installed
4. If PowerShell scripts don't run, try using the Command Prompt batch files instead
5. Make sure the file paths used in scripts match your actual directory structure
6. In PowerShell, remember that `&&` operator doesn't work - use the separate scripts provided
7. If you see "address already in use" errors, use the provided scripts which will attempt to close existing processes, or manually shut down any processes using those ports

## API Endpoints

### Tasks

- GET `/api/tasks` - Get all tasks
- GET `/api/tasks/{id}` - Get task by ID
- GET `/api/tasks/project/{projectId}` - Get tasks by project ID
- POST `/api/tasks` - Create new task
- PUT `/api/tasks/{id}` - Update task
- DELETE `/api/tasks/{id}` - Delete task

### Projects

- GET `/api/projects` - Get all projects
- GET `/api/projects/{id}` - Get project by ID
- POST `/api/projects` - Create new project
- PUT `/api/projects/{id}` - Update project
- DELETE `/api/projects/{id}` - Delete project

### Users

- GET `/api/users` - Get all users (admin only)
- GET `/api/users/non-admin` - Get all non-admin users
- GET `/api/users/{id}` - Get user by ID
- POST `/api/users` - Create new user
- PUT `/api/users/{id}` - Update user
- DELETE `/api/users/{id}` - Delete user 
