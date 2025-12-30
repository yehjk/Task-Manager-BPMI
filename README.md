# Task Manager System (MVP)

A **student microservice-based Task Manager application** developed as part of university coursework.

The system allows users to create boards, manage columns and tasks in a Kanban-style workflow, invite members, and track actions via an audit log.  
Authentication is handled using JWT with optional Google OAuth.

## Live Demo
- http://taskmanagerapp.org

## Documentation
Detailed documentation is available in the repository:

- **Frontend:** `Task_Manager_Frontend_Documentation.md`
- **Backend:** `Task_Manager_Backend_Documentation.md`
- **Deployment:** `Task_Manager_Deployment_Documentation.md`

## Technology Overview
- React + Vite (Frontend)
- Node.js + Express (Backend, microservices)
- MongoDB (Database)
- JWT + Google OAuth (Authentication)
- Caddy + Cloudflare (Reverse proxy & HTTPS)
