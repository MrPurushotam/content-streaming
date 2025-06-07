import HLSPlayer from "@/components/VIdeoPlayer";
import { currentWatchingVideoAtom } from "@/store/atoms";
import { useParams } from "react-router-dom";
import { useRecoilState } from "recoil";
import Seo from '../components/seo/seo';
import { useEffect, useRef, useState } from "react"; // Add useState import
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/spinner";
import { AlignLeft, Clock5, Eye, Heart, Info, Share2, Signal, SignalHigh } from "lucide-react";
const IndividualVideo = () => {
    const { id } = useParams();
    const [content, setContent] = useRecoilState(currentWatchingVideoAtom);
    const { toast } = useToast();
    const viewCountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [loading, setLoading] = useState(false); // Add loading state
    const contentRef = useRef(content);

    // Format thumbnail URL to ensure it's treated as absolute
    const formatUrl = (url: string | undefined): string => {

        if (!url) return "";
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        if (url.startsWith('https:/') && !url.startsWith('https://')) {
            return url.replace('https:/', 'https://');
        }

        if (url.startsWith('http:/') && !url.startsWith('http://')) {
            return url.replace('http:/', 'http://');
        }

        return `https://${url}`;
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                setContent(null);
                const resp = await api.get(`/video/${id}`);
                if (resp.data.success) {
                    contentRef.current = resp.data.content;
                    setContent(resp.data.content);
                    toast({ title: "Fetched content.", description: "Content fetched successfully." });
                }
            } catch (error: any) {
                console.log("Error fetching content: ", error);
                toast({ title: "Error fetching content.", description: error.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        if (!content && id) {
            setLoading(true)
            fetchContent();
        }
    }, [id, content, setContent, toast]);

    const handleVideoPlay = () => {
        if (viewCountTimeoutRef.current) {
            clearTimeout(viewCountTimeoutRef.current);
        }
        viewCountTimeoutRef.current = setTimeout(async () => {
            try {
                await api.put(`/video/view/${id}`);
            } catch (error: any) {
                console.log("Error updating view count: ", error);
                toast({ title: "Error updating view count.", description: error.message, variant: "destructive" });
            }
        }, 5000);
    };

    return (
        <>
            <Seo
                title={content?.title || "Untitled Video"}
                description={content?.description || "Watch this amazing video on our stream application."}
                keywords={`video, stream, watch, content, purushotam, hls, video streaming,${content?.title.split(" ").join(",")}`}
                name="Stream by Purushotam"
                type="video"
                address={`/watch/${id}`}
            />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div className="container mx-auto px-4 py-6 max-w-7xl">
                    {/* Video Player Section */}
                    <div className="relative mb-8">
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800">
                                    <Spinner />
                                </div>
                            ) : (
                                content?.manifestUrl && contentRef.current && (
                                    <HLSPlayer
                                        key={content.manifestUrl}
                                        src={formatUrl(contentRef.current.manifestUrl)}
                                        poster={formatUrl(content.thumbnail)}
                                        options={{ fullscreen: true, playbackRates: [0.5, 1, 1.5, 2], muted: false }}
                                        onPlay={handleVideoPlay}
                                    />)
                            )}
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl -z-10 blur-xl opacity-30"></div>
                    </div>

                    {/* Video Info Section */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Title and Views */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                                        {content?.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Eye className="w- h-3 text-current" />
                                        <span className="text-xs md:text-sm font-semibold flex flex-col">
                                            {content?.views?.toLocaleString() } views
                                        </span>
                                    </div>
                                </div>

                                {/* Video Metadata */}
                                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock5 className="w-5 h-5" />
                                        <span className="text-sm">
                                            {content?.createdAt ? new Date(content.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : 'Recently uploaded'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
                                        </svg>
                                        <span className="text-sm">HD Quality</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {content?.description && (
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <AlignLeft className="w-6 h-6 text-blue-500" />
                                        Description
                                    </h3>
                                    <div className="prose prose-slate max-w-none">
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {content.description}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Video Stats */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <SignalHigh className="w-7 h-7 text-green-600" />
                                    Video Stats
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Total Views</span>
                                        <span className="font-semibold text-slate-900">
                                            {content?.views?.toLocaleString() || "121"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                        <span className="text-slate-600">Quality</span>
                                        <span className="font-semibold text-slate-900">HD</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-slate-600">Format</span>
                                        <span className="font-semibold text-slate-900">HLS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
                                <div className="space-y-3">
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                                        <Heart className="w-4 h-4" />
                                        Like Video
                                    </button>
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                                        <Share2 className="w-4 h-4" />
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default IndividualVideo;
