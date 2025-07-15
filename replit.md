# Emergency Alert System

## Overview

This is a fully functional real-time emergency alert system built with React, Express, and WebSockets. The application allows users to create and join groups using 8-character tokens, send emergency alerts to group members, and receive real-time notifications. Users can participate without traditional email signup - only requiring a nickname. The system features a modern mobile-responsive UI built with shadcn/ui components and uses in-memory storage for fast prototyping.

## User Preferences

Preferred communication style: Simple, everyday language.

## Project Status

**Current State**: Fully functional SOS emergency alert application
**Last Updated**: January 15, 2025
**Key Features Tested**: Group creation, token sharing, real-time emergency alerts, WebSocket notifications

## Recent Changes

### January 15, 2025
- Fixed authentication headers in API requests (x-session-id header)
- Resolved SOS modal flashing issue by adding loading state checks
- Removed unstable animate-pulse class from dialog components
- Successfully tested complete workflow: group creation → emergency alerts → real-time notifications

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server for live notifications
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: In-memory storage with session IDs

### Data Storage
- **Storage**: In-memory storage implementation (MemStorage class)
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Session Management**: localStorage-based session IDs for anonymous users
- **Data Persistence**: Memory-based for fast development and testing

## Key Components

### Database Schema
- **Users**: Store user nicknames and session identifiers
- **Groups**: Emergency response groups with unique join tokens
- **Group Members**: Many-to-many relationship between users and groups
- **Alerts**: Emergency messages with type classification (emergency/resolved)

### Real-time Features
- WebSocket server mounted on `/ws` endpoint
- User authentication via session ID exchange
- Live alert broadcasting to group members
- Connection state management with automatic reconnection

### UI Components
- **SOS Button**: Large emergency button with visual feedback
- **Group Status**: Display user's groups and member counts
- **Recent Alerts**: Timeline of emergency notifications
- **Modal System**: Create/join group workflows
- **Toast Notifications**: Real-time alert notifications

## Data Flow

1. **User Session**: Anonymous users get session IDs stored in localStorage
2. **Group Management**: Users can create groups (get tokens) or join existing groups (via tokens)
3. **Emergency Alerts**: SOS button triggers alerts sent to all group members
4. **Real-time Updates**: WebSocket connections deliver instant notifications
5. **Alert History**: Recent alerts displayed with sender and group information

## External Dependencies

### Core Framework Dependencies
- React ecosystem: React, React DOM, React Hook Form
- State management: TanStack Query for server state caching
- UI primitives: Radix UI components for accessibility
- Styling: Tailwind CSS with class-variance-authority for component variants

### Backend Dependencies
- Express server with WebSocket support (ws library)
- Drizzle ORM with PostgreSQL adapter
- Neon Database serverless driver
- Session management with connect-pg-simple

### Development Tools
- Vite with React plugin and TypeScript support
- Replit-specific development plugins
- ESBuild for production bundling
- PostCSS with Tailwind and Autoprefixer

## Deployment Strategy

### Development Environment
- Vite dev server with HMR and middleware mode
- Express server serves API routes and static files
- WebSocket server shares HTTP server instance
- Environment variables for database connection

### Production Build
- Frontend: Vite builds optimized React bundle to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Static file serving through Express in production
- WebSocket server maintains persistent connections

### Database Management
- Drizzle migrations stored in `/migrations` directory
- Schema synchronization via `db:push` command
- Environment-based database URL configuration
- Serverless PostgreSQL connection pooling

The application uses a monorepo structure with shared TypeScript definitions, enabling type safety across the full stack while maintaining clear separation between client and server concerns.