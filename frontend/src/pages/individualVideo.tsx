import HLSPlayer from "@/components/VIdeoPlayer";
import { currentWatchingVideoAtom } from "@/store/atoms";
import { useParams } from "react-router-dom";
import { useRecoilState } from "recoil";
import Seo from '../components/seo/seo';
import { useEffect, useRef, useState } from "react"; // Add useState import
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Spinner from "@/components/spinner";
const IndividualVideo = () => {
    const { id } = useParams();
    const [content, setContent] = useRecoilState(currentWatchingVideoAtom);
    const { toast } = useToast();
    const viewCountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [loading, setLoading] = useState(false); // Add loading state
    const contentRef = useRef(content);

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
            <div className="w-full min-h-screen flex flex-col items-center gap-4 p-4 bg-gray-100">
                <div className="w-full max-w-6xl aspect-video bg-gradient-to-r from-[#232526] to-[#414345] rounded-lg overflow-hidden shadow-lg">
                    {loading ? (
                        <Spinner />
                    ) : (
                        content?.manifestUrl && contentRef.current && (
                            <HLSPlayer
                                key={content.manifestUrl}
                                src={contentRef.current.manifestUrl || ""}
                                poster={content.thumbnail}
                                options={{ fullscreen: true, playbackRates: [0.5, 1, 1.5, 2], muted: false }}
                                onPlay={handleVideoPlay}
                            />)
                    )}
                </div>

                {/* Video Info */}
                <div className="w-full max-w-5xl px-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wide text-gray-900">
                            {content?.title || "Untitled Video"}
                        </h2>
                        <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">
                            {content?.views?.toLocaleString() || "121"} Views
                        </span>
                    </div>

                    {content?.description && (
                        <p className="mt-3 bg-gray-200 text-gray-800 p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg shadow-md text-sm sm:text-base md:text-lg leading-relaxed">
                            {content?.description}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
};

export default IndividualVideo;
