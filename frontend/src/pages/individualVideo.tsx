import HLSPlayer from "@/components/VIdeoPlayer";
import { currentWatchingVideoAtom } from "@/store/atoms";
import { useParams } from "react-router-dom";
import { useRecoilValue } from "recoil";

const IndividualVideo = () => {
    const { id } = useParams();
    const content = useRecoilValue(currentWatchingVideoAtom);

    return (
        <div className="w-full min-h-screen flex flex-col items-center gap-4 p-4 bg-gray-100">
            {/* Video Player */}
            <div className="w-full max-w-6xl aspect-video bg-gradient-to-r from-[#232526] to-[#414345] rounded-lg overflow-hidden shadow-lg">
                <HLSPlayer
                    src={content?.manifestUrl}
                    options={{ fullscreen: true, playbackRates: [0.5, 1, 1.5, 2], muted: false }}
                    poster={content?.thumbnail}
                />
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
    );
};

export default IndividualVideo;
