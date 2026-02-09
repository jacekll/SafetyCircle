# Emergency Alert System

## Overview

This is a real-time emergency alert system built with React, Express, and WebSockets. The application allows users to create and join groups using 8-character tokens, send emergency alerts to group members, and receive real-time notifications. Users can participate without traditional email signup - only requiring a nickname. The system features a modern mobile-responsive UI built with shadcn/ui components.

Built with **Replit** to try it out and try out **Progressive Web App (PWA)** capabilities. Updated to enable local development.


<img width="446" height="902" src="https://github.com/jacekll/SafetyCircle/blob/main/docs%2FScreenshot.png">


## User Preferences

Preferred communication style: Simple, everyday language.

## Project Status

**Current State**: SOS emergency alert application PoC with rich feature set

**Key Features Tested**: Group creation, token sharing, real-time emergency alerts, WebSocket notifications, alert archiving, answer tracking, haptic feedback, clickable notifications

## Recent Changes

### January 16, 2025
- **Enhanced Security with Cryptographic Token Generation**:
  - Replaced Math.random() with Node.js crypto.randomBytes() for secure token generation
  - Implemented cryptographically secure random number generation using 48-bit entropy
  - Added timestamp-based additional entropy for enhanced unpredictability
  - Group tokens now generated using industry-standard secure randomness
  - Maintains 8-character readable format (uppercase letters and numbers)
- **Implemented Persistent Database Storage**:
  - Switched from in-memory storage to PostgreSQL database
  - Created comprehensive DatabaseStorage class with full CRUD operations
  - Added database connection and schema management
  - Implemented basic concurrency control through database constraints
  - All data now persists across server restarts
  - Successfully tested group creation, alerts, and user management with database
- **Completed Green Checkmark Notification System**:
  - Fixed WebSocket message broadcasting structure for alert-answered messages
  - Implemented proper message type handling in client WebSocket hook
  - Added comprehensive debugging and error handling for WebSocket connections
  - Successfully tested green notifications with checkmark icons when alerts are answered
  - System now shows "Alert Answered" with green styling and haptic feedback
  - Real-time broadcasting works across multiple browsers and sessions
  - Resolved TypeScript errors in server push notification handling
- **Implemented Alert Archive System**:
  - Added archive database schema with archivedAlerts table
  - Created archive API endpoints (`POST /api/alerts/:id/archive`, `GET /api/alerts/archived`)
  - Built archive confirmation modal with alert details preview
  - Added archive dropdown menus to alert cards with three-dot menu
  - Created dedicated `/archive` page showing archived alerts with location links
  - Added hamburger menu in alerts page for archive access
  - Updated alert queries to filter out archived alerts from main view
  - Backend API tested and working correctly with proper authentication
- **Implemented "Mark as Answered" Functionality**:
  - Added database schema for tracking who answered alerts (answeredBy, answeredAt fields)
  - Created API endpoint POST /api/alerts/:id/answer with authentication
  - Added "Mark as Answered" option to alert dropdown menus
  - Implemented real-time WebSocket notifications when alerts are answered
  - Added answered status display showing who responded to alerts
  - Updated both main alerts and archive pages to show answer status
- **Implemented Haptic Feedback System**:
  - Created comprehensive haptic feedback hook with pattern customization
  - Added SOS pattern vibration for emergency alerts (long-short-long sequence)
  - Implemented different patterns for answered alerts and user actions
  - Added haptic feedback settings toggle in Groups page
  - Integrated haptic feedback into SOS button press for immediate response
  - Added localStorage-based user preferences for haptic feedback
  - Supports light, medium, and heavy intensity levels
- **Enhanced Alert Notifications with Navigation**:
  - Added clickable "View Details" button to incoming alert toast notifications
  - Emergency alert messages now link directly to Alert History page
  - Alert answered notifications also include navigation to Alert History
  - Proper ToastAction component implementation for user interaction
  - Tested and confirmed working in browser interface
- **Improved Group UI with Shield Icons and Details Modal**:
  - Replaced suitcase icons with shield icons throughout group interface
  - Added kebab menu (three dots) to each group item for better UX
  - Created comprehensive group details modal with member list
  - Implemented hidden token reveal functionality with copy-to-clipboard
  - Removed admin role system - all members can view tokens and manage groups
  - Added API endpoint for fetching group members with proper authentication
  - Removed unnecessary status section from group details modal
- Cleaned up debugging logging from Android PWA push notification implementation
- Streamlined push notification hooks and service worker code
- Maintained Android-specific PWA configurations and compatibility fixes

### January 15, 2025
- Fixed authentication headers in API requests (x-session-id header)
- Resolved SOS modal flashing issue by adding loading state checks
- Removed unstable animate-pulse class from dialog components
- Successfully tested complete workflow: group creation → emergency alerts → real-time notifications
- Reorganized app into cleaner multi-screen structure:
  - Main screen: Focused on SOS button with navigation cards
  - Groups screen: Dedicated group management and statistics
  - Alerts screen: Emergency alert history and help information
- Improved navigation with proper routing and back buttons
- Added GPS location sharing feature:
  - Emergency alerts now include GPS coordinates when available
  - Location permission requests handled gracefully
  - Maps integration for viewing alert locations
  - Real-time location accuracy display in SOS modal
  - Location links in alert history for emergency events
- Implemented push notifications for Android mobile devices:
  - Web Push API integration with service worker
  - Users can enable/disable push notifications in Groups page
  - Emergency alerts sent as push notifications when app is closed
  - VAPID keys configured for secure push messaging
  - Push notifications include location data when available
- Developed one-tap SOS home screen widget:
  - Progressive Web App (PWA) implementation with manifest.json
  - Dedicated SOS widget page (/sos-widget) with same functionality as main app
  - App shortcuts configuration for home screen widget access
  - PWA install prompts with automatic detection
  - Complete standalone SOS interface with status indicators
  - Direct emergency alert sending with GPS location integration
  - Proper PWA metadata and icons for mobile installation

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
  - Location fields: latitude, longitude, locationAccuracy for GPS coordinates
  - Real-time broadcasting of location data to group members
- **Archived Alerts**: User-specific alert archiving system
  - Links users to archived alerts with timestamp
  - Filters archived alerts from main alert views
  - Maintains alert history for user reference

### Real-time Features
- WebSocket server mounted on `/ws` endpoint
- User authentication via session ID exchange
- Live alert broadcasting to group members
- Connection state management with automatic reconnection
- Push notifications for offline users via Web Push API
- Service worker for background notification handling

### UI Structure
- **Main Screen**: Focused SOS button with navigation to other screens
- **Groups Screen**: Complete group management with join/create functionality
- **Alerts Screen**: Emergency alert history and help information
- **Navigation**: Seamless routing between screens with back buttons

### Core Components
- **SOS Button**: Large emergency button with visual feedback
- **Group Management**: Create groups, join with tokens, view statistics
- **Alert History**: Timeline of emergency notifications with real-time updates
- **Modal System**: Join group workflows and emergency confirmation
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

## Local Development

The dev server requires a local PostgreSQL instance managed by Docker Compose.

```bash
# First-time setup: create your .env file and fill in the details
cp .env.example .env

# Start the database and dev server:
npm run dev

# Or run each step manually:
docker-compose up -d        # Start the database
tsx server/index.ts          # Start the dev server
```

The database configuration is defined in `.env` and `docker-compose.yaml`.

## Running Tests

Tests run against a local PostgreSQL instance managed by Docker Compose.

```bash
# Run the full test suite (starts DB, runs tests, tears down DB):
npm test

# Or run each step manually:
docker compose -f docker-compose.tests.yaml up -d   # Start test DB
cross-env NODE_ENV=test tsx test-member-count.ts     # Run tests
docker compose -f docker-compose.tests.yaml down -v  # Tear down test DB
```

The test database configuration is defined in `.env.test` and `docker-compose.tests.yaml`.

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