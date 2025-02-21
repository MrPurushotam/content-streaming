
export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    
}

export interface Video {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    manifestUrl: string;
    views: number;
    uploadTime:string;
    status: string;
}

export interface adminVideoTypes{
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    uniqueId: string;
    views: number;
    uploadTime: Date;
    public: boolean;
    status: string;
    manifestUrl:string;
    updatedAt:Date;
}

export interface UploadState {
    isUploading: boolean;
    progress: number;
    currentUpload: {
        title: string;
        description: string;
        thumbnail: string;
        public: boolean;
        uniqueId?: string;
    } | null;
}



