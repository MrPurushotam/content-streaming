# Video Streaming Platform

A comprehensive video streaming application that allows users to upload, process, and stream videos with adaptive bitrate streaming (HLS). This project demonstrates a real-world implementation of video processing, cloud storage, and streaming technologies.

![Project Banner](https://placehold.co/1200x400?text=Video+Streaming+Platform)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Components](#components)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Deployment](#deployment)
- [Technical Details](#technical-details)

## 🔍 Overview

This platform enables content creators to upload videos, which are then automatically processed, transcoded into multiple resolutions, and made available for streaming with adaptive bitrate technology. The application ensures high-quality video playback regardless of the viewer's network conditions.

The system uses a queue-based architecture to handle video processing asynchronously, ensuring scalability and reliability even with large video files and high traffic.

## ✨ Features

- **User Authentication & Authorization**
  - Role-based access control (admin/user roles)
  - Secure JWT-based authentication
  - Admin approval workflow for content creators

- **Video Management**
  - Upload videos via presigned S3 URLs
  - Add metadata (title, description, thumbnail)
  - Public/private visibility control
  - View count tracking
  - Video deletion

- **Video Processing**
  - Automatic transcoding to multiple resolutions (360p, 720p, 1080p)
  - HTTP Live Streaming (HLS) format conversion
  - Adaptive bitrate streaming
  - Fault-tolerant processing with retries

- **Content Delivery**
  - CDN integration for fast global delivery
  - Adaptive streaming based on viewer's bandwidth
  - Optimized for various devices and network conditions

- **Administration**
  - User management dashboard
  - Content moderation
  - System health monitoring

## 🏗️ Architecture

The application follows a modern microservice-oriented architecture:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│    API      │────▶│  Database   │
│   (React)   │◀────│  (Express)  │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                          │  ▲
                          │  │
                          ▼  │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  S3 Storage │◀───▶│ Video Queue │◀───▶│    Video    │
│    (AWS)    │     │   (Redis)   │     │ Processing  │
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Frontend**: React application with TypeScript, using Zustand for state management
- **Backend API**: Express.js server handling authentication, content management
- **Database**: PostgreSQL with Prisma ORM
- **Queuing System**: Redis-based message queues for video processing jobs
- **Storage**: AWS S3 buckets for video files and processed content
- **Processing Pipeline**: FFmpeg-based video transcoding microservice

## 🛠️ Tech Stack

- **Frontend**:
  - React 18
  - TypeScript
  - Zustand (State Management)
  - TailwindCSS + ShadCN UI
  - Video.js (Player)

- **Backend**:
  - Node.js with Express
  - PostgreSQL with Prisma ORM
  - Redis for queuing
  - JWT for authentication
  - Serverless functions for processing

- **Cloud & Infrastructure**:
  - AWS S3 for storage
  - AWS Lambda for serverless functions
  - CDN for content delivery

- **Video Processing**:
  - FFmpeg for transcoding
  - HLS (HTTP Live Streaming) protocol

## 🧩 Components

The application consists of several key components:

### 1. Main Backend Server

Handles API requests, authentication, and manages the content database. Coordinates the video upload and processing workflow.

### 2. Custom Prisma Package

A shared Prisma client package that centralizes database schema and client generation for use across microservices.

### 3. Video Processing Service

A serverless function that:
- Retrieves video processing jobs from the queue
- Downloads videos from primary S3 bucket
- Transcodes videos into multiple resolutions using FFmpeg
- Creates HLS playlists and segments
- Uploads processed files to the secondary S3 bucket
- Updates the database with video details

### 4. S3 Cleanup Service

A serverless function that handles cleanup of temporary files and ensures the storage is efficiently managed.

### 5. Frontend Application

React-based user interface that provides:
- User authentication
- Video uploading
- Content browsing
- Video playback with adaptive streaming
- Admin dashboard

## 📦 Installation & Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- Redis
- AWS Account with S3 access
- FFmpeg (for local development)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MrPurushotam/content-streaming.git
   cd livestreaming-application
   ```

2. Install dependencies for the backend:
   ```bash
   cd backend
   npm install
   ```

3. Set up environment variables (create `.env` file):
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/videodb
   AIVEN_REDIS_URL=redis://localhost:6379
   AIVEN_REDIS_PASSWORD=your_redis_password
   
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_PRIMARYBUCKET_NAME=your-primary-bucket
   AWS_S3_SECONDARYBUCKET_NAME=your-secondary-bucket
   
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:5173
   
   CDN_BASE_URL=https://your-cdn-url.com
   
   VIDEO_PROCESSING_FUNCTION_URL=http://localhost:3001
   S3CLEANUP_FUNCTION_URL=http://localhost:3002
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Install dependencies for the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

2. Set up environment variables (create `.env` file):
   ```
   VITE_API_URL=http://localhost:3000/api/v1
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

### Video Processing Service Setup

1. Install dependencies for the video processing service:
   ```bash
   cd ../backend/pipeline/VideoProcessing
   npm install
   ```

2. Create a `.env` file with the same variables as the backend.

3. Start the video processing service:
   ```bash
   npm run dev
   ```

### S3 Cleanup Service Setup

1. Install dependencies for the S3 cleanup service:
   ```bash
   cd ../S3Cleanup
   npm install
   ```

2. Create a `.env` file with the same variables as the backend.

3. Start the S3 cleanup service:
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Database Configuration

The application uses Prisma ORM with a PostgreSQL database. The schema is defined in:
- `/Packages/CustomPrismaPackage/prisma/schema.prisma`

Key entities include:
- `User`: Stores user information and authentication details
- `Content`: Represents uploaded videos with metadata
- `BiteRateVideo`: Tracks different resolution versions of videos
- `VideoSourceInfo`: Manages the original video source information

### AWS S3 Configuration

The application uses two S3 buckets:
1. **Primary Bucket**: For initial video uploads (temporary storage)
2. **Secondary Bucket**: For processed videos and HLS content (permanent storage)

### Redis Queue Configuration

The application uses Redis for message queues:
- `ffmpeg_queue`: Video processing jobs
- `primary_bucket_queue`: S3 cleanup jobs

## 🚀 Usage

### User Workflow

1. **Registration & Login**:
   - Create an account with email and password
   - Admin users require approval before posting content

2. **Uploading Videos**:
   - Navigate to the upload page
   - Get a presigned URL for S3 upload
   - Upload video directly to S3
   - Add metadata (title, description, thumbnail)
   - Submit for processing

3. **Processing**:
   - Video is queued for processing
   - FFmpeg transcodes video to multiple resolutions
   - HLS playlists and segments are created
   - Processed files are stored in S3

4. **Viewing Content**:
   - Browse videos on the homepage
   - Click to view a video
   - Video player automatically selects the appropriate resolution based on bandwidth

### Admin Workflow

1. **User Management**:
   - Approve or reject new admin users
   - Manage existing users

2. **Content Management**:
   - Review uploaded content
   - Delete inappropriate content
   - Edit video metadata

## 🧪 Development

### Project Structure

```
livestreaming-application/
├── backend/
│   ├── libs/                # Shared libraries (AWS, etc.)
│   ├── middleware/          # Express middleware
│   ├── pipeline/            # Video processing services
│   │   ├── VideoProcessing/ # FFmpeg transcoding service
│   │   └── S3Cleanup/       # S3 cleanup service
│   ├── prisma/              # Database schema and migrations
│   ├── routes/              # API routes
│   └── utils/               # Utility functions
├── frontend/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page components
│       ├── store/           # Zustand store
│       └── utils/           # Utility functions
└── Packages/
    └── CustomPrismaPackage/ # Shared Prisma client package
```

### Development Guidelines

- **Frontend**: Follow React best practices, use TypeScript for type safety
- **Backend**: Use Express middleware for authentication, validation
- **Database**: Use Prisma migrations for schema changes
- **Testing**: Write unit tests for critical components

## 📤 Deployment

### Backend Deployment

The backend is designed to be deployed as serverless functions:

1. **API Server**:
   - Deploy as an AWS Lambda function
   - Configure with API Gateway

2. **Video Processing**:
   - Deploy as a separate AWS Lambda function
   - Configure with higher memory and longer timeout

3. **S3 Cleanup**:
   - Deploy as a scheduled AWS Lambda function
   - Configure to run periodically

### Frontend Deployment

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the built assets to a static hosting service (AWS S3, Vercel, Netlify)

## 🔍 Technical Details

### Video Processing Workflow

1. **Upload**: User uploads video to S3 using presigned URL
2. **Queue**: Video details are added to Redis queue
3. **Process**: Video processing service:
   - Downloads video from S3
   - Uses FFmpeg to transcode to multiple resolutions
   - Creates HLS playlist and segments
   - Uploads processed files to S3
4. **Update**: Database is updated with video details
5. **Cleanup**: Original video is marked for cleanup

### HLS Implementation

The application creates HTTP Live Streaming (HLS) content:
- Master playlist (`master.m3u8`) pointing to resolution-specific playlists
- Resolution-specific playlists (`playlist.m3u8`) for each quality level (360p, 720p, 1080p)
- Video segments (`.ts` files) of configurable duration (10 seconds)

### Error Handling & Retry Logic

The video processing pipeline includes sophisticated error handling:
- Failed jobs are requeued with retry count tracking
- Maximum retry limit prevents infinite loops
- Dead-letter queue for permanently failed jobs
- Detailed logging for debugging

### Security Considerations

- JWT-based authentication with secure token handling
- Role-based access control
- Presigned URLs for secure S3 uploads
- Rate limiting to prevent abuse
- Input validation on all API endpoints

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Purushotam Jeswani**

- GitHub: [@MrPurushotam](https://github.com/MrPurushotam)

---

## Acknowledgements

- FFmpeg for video transcoding
- React and Express teams for the excellent frameworks
- Video.js for the player implementation
