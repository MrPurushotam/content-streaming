import VideoCard from "@/components/home/VideoCard"
import { homeContentAtom } from "@/store/atoms"
import { useRecoilValue} from "recoil"

const Home = () => {
    const content = useRecoilValue(homeContentAtom);
    return (
        <div className="flex flex-col gap-4 w-full mx-auto border-2 border-gray-200 min-h-screen overflow-y-auto overflow-x-hidden p-4 bg-gray-50">
            <h1 className="text-2xl font-bold text-center text-gray-800">Home</h1>
            <p className="text-md font-medium tracking-wide text-center text-amber-600">{content.length > 0 ? "Scroll through videos here. Hope you have a good time!" : "Nothing here to watch. Come back later."}</p>
            <div className="w-full h-full px-4 py-3 flex flex-wrap gap-4 justify-center">
                {
                    content?.map((video) => {
                        return (
                            <VideoCard key={video.id} id={video.id} thumbnail={video.thumbnail} title={video.title} views={video.views} video ={video} />
                        )
                    })
                }
                <VideoCard />
            </div>
        </div>
    )
}

export default Home
