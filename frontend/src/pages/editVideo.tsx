import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from './NotFound';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useRecoilValue } from 'recoil';
import { adminUploadedContentAtom } from '@/store/atoms';
import HLSPlayer from '@/components/VIdeoPlayer';
import { X } from 'lucide-react';
import { adminVideoTypes } from '@/types/common';
import api from '@/lib/api';

const EditVideo = () => {
    const params = useParams();
    const videos = useRecoilValue(adminUploadedContentAtom);
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isPublic, setIsPublic] = useState<boolean>(false);
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [manifest, setManifest] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const [contentId, setContentId] = useState<string>('');
    const [videoDetails, setVideoDetails] = useState<adminVideoTypes | null>(null);
    const uniqueIdRef = useRef<string>('');

    // Fetch video details
    useEffect(() => {
        if (params?.id) {
            // @ts-ignore
            const foundVideo = videos.find((video) => video.id === parseInt(params.id,10));
            if (foundVideo) {
                uniqueIdRef.current = foundVideo.uniqueId;
                setContentId(params.id);
                setVideoDetails(foundVideo);
                setIsPublic(foundVideo.public);
                setTitle(foundVideo.title);
                setDescription(foundVideo.description);
                setPreview(foundVideo.thumbnail);
                setManifest(foundVideo.manifestUrl);
            } else {
                setVideoDetails(null);
            }
        }
    }, [params, videos]);

    if (!videoDetails) return <NotFound />;

    // Handle updating the content
    const updateContent = async () => {
        setLoading(true);
        try {
            // Prepare form data
            const formData = new FormData();
            if(title!=videoDetails.title) formData.append('title', title);
            if(description!=videoDetails.description) formData.append('description', description)
            if(isPublic!= videoDetails.public) formData.append('public', JSON.stringify(isPublic));
            if (thumbnail) formData.append('thumbnail', thumbnail);

            // Send update request
            const response = await api.put(`/video/${contentId}`, formData, {
                headers: {
                    'x-admin-token': window.localStorage.getItem('adminToken') || '',
                    'Content-Type':'multipart/form-data',
                    'x-unique-id': uniqueIdRef.current 
                }
            });

            if (!response.data.success) throw new Error('Failed to update video');
            // add mech to update the content with new details 
            toast({
                title: 'Success',
                description: 'Video updated successfully',
            });

            navigate('/dashboard');
        } catch (error:any) {
            toast({
                title: 'Error',
                description: 'Failed to update video'
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle thumbnail upload preview
    const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setThumbnail(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // Remove the uploaded thumbnail
    const removeThumbnail = () => {
        setThumbnail(null);
        setPreview(videoDetails?.thumbnail || null);
    };

    return (
        <div className="w-full h-screen flex flex-col items-center p-8 bg-gray-50">
            <div className="w-1/2 border-2 border-cyan-600 shadow-md shadow-cyan-500 rounded-md my-7 p-2 flex flex-row gap-4 items-center">
                <div className="aspect-video w-60 h-52 rounded-md border-2 border-red-500 bg-gray-200 flex justify-center items-center">
                    {preview ? (
                        <img src={preview} alt="Thumbnail" className="w-full h-full object-cover rounded-md" />
                    ) : (
                        <span className="text-gray-500">No Thumbnail</span>
                    )}
                </div>
                <div className="w-full h-full border-2 border-gray-500 rounded-md flex flex-col px-3 py-2 gap-2">
                    <p className="text-gray-700 font-semibold">Visibility: {isPublic ? 'Public' : 'Private'}</p>
                    <p className="text-gray-700 font-semibold">Title: {title || 'N/A'}</p>
                    <p className="text-gray-700 font-semibold">Description: {description || 'N/A'}</p>
                    <p className="text-gray-700 font-semibold">Status: <span>{videoDetails?.status}</span></p>
                    <p className="text-gray-700 font-semibold">Uploaded At: <span>{new Date(videoDetails?.uploadTime).toLocaleDateString()}</span></p>
                    <p className="text-gray-700 font-semibold">Last update At: <span>{new Date(videoDetails?.updatedAt).toLocaleDateString()}</span></p>
                </div>

                <div className="aspect-video w-60 h-52 rounded-md border-2 border-red-500 bg-gray-200 flex justify-center items-center">
                    {manifest ? (
                        <HLSPlayer src={manifest} options={{ fullscreen: 'true', playbackRates: [0.5, 1, 1.5, 2], muted: true }} />
                    ) : (
                        <span className="text-gray-500">No video source</span>
                    )}
                </div>
            </div>

            <div className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg flex gap-8 items-start border border-gray-200">
                {/* Thumbnail Upload */}
                <div className="flex flex-col items-center gap-4 w-1/3">
                    <label className="text-lg font-semibold text-gray-700">Thumbnail</label>
                    {preview ? (
                        <div className="relative w-40 h-40 rounded-lg overflow-hidden shadow-md border border-gray-300">
                            <img src={preview} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                            {thumbnail && <button
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                                onClick={removeThumbnail}
                                disabled={loading}
                            >
                                <X size={18} />
                            </button>}
                        </div>
                    ) : (
                        <label className="w-40 h-40 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                            <Input type="file" accept="image/*" disabled={loading} onChange={handleThumbnailUpload} className="hidden" />
                            <span className="text-gray-500">Upload Thumbnail</span>
                        </label>
                    )}
                </div>

                <div className="flex flex-col gap-5 flex-1">
                    {/* Public Toggle */}
                    <div className="flex items-center justify-between border-b pb-3">
                        <span className="text-lg font-semibold text-gray-700">Public</span>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={loading} />
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 mb-1">Title</label>
                        <Input
                            type="text"
                            disabled={loading}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter video title"
                            className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 mb-1">Description</label>
                        <Textarea
                            value={description}
                            disabled={loading}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={5000}
                            placeholder="Enter video description (max 5000 words)"
                            className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    {/* Upload Button */}
                    <Button onClick={updateContent} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-md transition">
                        {loading ? 'Updating...' : 'Update'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditVideo;
