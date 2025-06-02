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
            
            {globalLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-70 z-10">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <div className="text-blue-600 font-semibold mt-4 text-lg flex">
                        Loading<AnimatedEllipsis />
                    </div>
                </div>
            )}
            
            <h1 className="text-2xl font-bold text-center text-gray-800">Home</h1>
            <p className="text-md font-medium tracking-wide text-center text-amber-600">{content.length > 0 ? "Scroll through videos here. Hope you have a good time!" : "Nothing here to watch. Come back later."}</p>
            <div className="w-full h-full px-4 py-3 flex flex-wrap gap-4 justify-center">
                {
                    content?.map((video) => {
                        return (
                            <VideoCard key={video.id} id={video.id} thumbnail={video.thumbnail} title={video.title} views={video.views} video={video} />
                        )
                    })
                }
            </div>
        </div>
    )
}

export default Home
