import { currentWatchingVideoAtom } from '@/store/atoms';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';

interface VideoCardTypes {
    id?: number;
    title: string;
    views: number;
    thumbnail: string | undefined;
    video?: any
}

const VideoCard: React.FC<VideoCardTypes> = ({ id, title = "dfds", views = 535, thumbnail = "https://i.pinimg.com/originals/d9/f2/15/d9f21515b1e38d83e94fdbce88f623b6.gif", video }) => {
    const [isHovered, setIsHovered] = useState<boolean>(false)
    const navigate = useNavigate();
    const setWatching = useSetRecoilState(currentWatchingVideoAtom);
    const openVideo = () => {
        setWatching(video);
        navigate(`/watch/${id}`);
    }
    return (
        <div className={`w-full sm:w-[100%] md:w-[48%] lg:w-[32%] xl:w-[32%] h-76 p-2 rounded-md shadow-md flex flex-col gap-1 border-2 border-red-500 transition-shadow duration-300 ${isHovered ? 'shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={()=>openVideo()}
        >
            <div className='border-2 border-blue-500 aspect-video rounded-lg w-full h-full'>
                <img src={thumbnail} alt="thumbnail" className="w-full aspect-auto h-full bg-cover" />
            </div>

            <div className='flex flex-col px-2 py-1'>
                <div className='flex flex-row justify-between'>
                    <h2 className="text-lg font-semibold ">
                        {title}
                    </h2>
                    <span>
                        {views}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default VideoCard
