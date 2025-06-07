import VideoCard from "@/components/home/VideoCard"
import { globalLoadingAtom, homeContentAtom } from "@/store/atoms"
import { useRecoilValue } from "recoil"
import Seo from '../components/seo/seo';
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Animated ellipsis component
const AnimatedEllipsis = () => {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return "";
                return prev + ".";
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return <span className="w-6 inline-block">{dots}</span>;
};

const Home = () => {
    const content = useRecoilValue(homeContentAtom);
    const globalLoading = useRecoilValue(globalLoadingAtom);

    return (
        <div className="flex flex-col gap-4 w-full mx-auto border-2 border-gray-200 min-h-screen overflow-y-auto overflow-x-hidden p-4 bg-gray-50 relative">
            <Seo
                title="Home"
                description="Welcome to the home page. Browse through the videos."
                keywords="home, videos, streaming,watch,video,content,purushotam,youtube,hls,video streaming"
                name="Stream by Purushotam"
                type="website"
                address={'/'}
            />

            {content.length < 1 &&
                <p className="text-md font-medium tracking-wide text-center text-amber-600 mt-5">
                    Nothing here to watch. Come back later.
                </p>
            }

            {globalLoading ? (
                <div className="w-full h-96 flex flex-col items-center justify-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                    <div className="text-gray-800 font-semibold text-xl flex items-center">
                        Loading<AnimatedEllipsis />
                    </div>
                    <p className="text-gray-600 mt-2 text-center">Fetching videos for you</p>
                </div>
            ) : (
                <div className="w-full h-full px-4 py-3 flex flex-wrap gap-4 justify-center">
                    {
                        content?.map((video) => {
                            return (
                                <VideoCard key={video.id} id={video.id} thumbnail={video.thumbnail} title={video.title} views={video.views} video={video} />
                            )
                        })
                    }
                </div>
            )}
        </div>
    )
}

export default Home
