# Livestreaming Application

A full-featured video streaming platform built with modern web technologies and cloud infrastructure, enabling users to upload, process, and stream videos with adaptive bitrate streaming.

![Project Banner](./frontend/public/Homepage.png)

## 🌟 Features

### Core Functionality
- **Video Upload & Processing**: Secure video upload to AWS S3 with automated processing pipeline
- **Adaptive Bitrate Streaming**: HLS (HTTP Live Streaming) with multiple quality options (360p, 720p, 1080p)
- **Real-time Video Player**: Custom HLS player with quality selection and buffering management
- **Content Management**: Admin dashboard for video management and user approval

### Technical Features
- **Cloud Infrastructure**: AWS Lambda-based serverless video processing
- **Queue Management**: Redis-based job queuing for video processing tasks
- **CDN Integration**: CloudFront distribution for optimized content delivery
- **File Size Validation**: Client and server-side file size validation
- **Presigned URLs**: Secure direct-to-S3 uploads with temporary access
- **Retry Logic**: Automated retry mechanisms for failed video processing

## 🔍 Overview

This platform enables content creators to upload videos, which are then automatically processed, transcoded into multiple resolutions, and made available for streaming with adaptive bitrate technology. The application ensures high-quality video playback regardless of the viewer's network conditions.

The system uses a queue-based architecture to handle video processing asynchronously, ensuring scalability and reliability even with large video files and high traffic.

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

## 📋 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/verify` - Token verification

### Content Management
- `GET /video/` - Get all public videos
- `GET /video/:id` - Get specific video
- `PUT /video/view/:id` - Increment view count
- `POST /content/metadata` - Upload video metadata
- `POST /content/confirmsource` - Confirm video upload
- `GET /content/status/:id` - Get processing status

### Admin
- `GET /user/uploads` - Get user's uploaded videos
- `PUT /video/:id` - Update video details
- `DELETE /video/:id` - Delete video
- `GET /user/list/admin` - Get pending admin approvals

## 🎥 Video Processing Pipeline

1. **Upload Request**: Client requests presigned URL
2. **Direct Upload**: Video uploaded directly to S3 primary bucket
3. **Queue Processing**: Video processing job added to Redis queue
4. **Lambda Processing**: FFmpeg processes video into multiple bitrates
5. **HLS Generation**: Creates master playlist and segment files
6. **S3 Storage**: Processed files stored in secondary bucket
7. **Database Update**: Video status updated to "published"
8. **CDN Distribution**: Content available via CloudFront

## 🔧 File Size Limits

- **Video Files**: 100MB maximum
- **Thumbnail Images**: 5MB maximum
- **Supported Formats**: MP4, MOV, AVI (video) / JPG, PNG, WEBP (thumbnails)

## 🎯 Quality Options

The application automatically generates three quality levels:
- **360p**: 640x360, 800k bitrate
- **720p**: 1280x720, 2.5M bitrate  
- **1080p**: 1920x1080, 5M bitrate

## 🛡️ Security Features

- JWT-based authentication
- Admin role-based access control
- Rate limiting on API endpoints
- File type and size validation
- CORS protection
- Presigned URL expiration (3 hours)

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop browsers
- Tablet devices
- Mobile phones
- Touch interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Developer

Built by **Purushotam Jeswani**
- GitHub: [@MrPurushotam](https://github.com/MrPurushotam)
- LinkedIn: [purushotamjeswani](https://linkedin.com/in/purushotamjeswani)
- Email: work.purushotam@gmail.com

---

## Acknowledgements

- FFmpeg for video transcoding
- React and Express teams for the excellent frameworks
- Video.js for the player implementation
