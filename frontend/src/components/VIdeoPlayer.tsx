import { useEffect, useRef, MutableRefObject, useState } from "react";
import videojs from "video.js";
// @ts-ignore
import type { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import "@videojs/http-streaming";
import "video.js/dist/video-js.css";

interface HLSPlayerProps {
    src: string;
    poster?: string;
    options?: VideoJsPlayerOptions;
    onPlay?: () => void;
    className?:string;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ src, options = {}, poster, onPlay,className="" }) => {
    const videoRef: MutableRefObject<HTMLVideoElement | null> = useRef(null);
    const playerRef: MutableRefObject<VideoJsPlayer | null> = useRef(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !videoRef.current || playerRef.current) return;

        playerRef.current = videojs(videoRef.current, {
            ...options,
            controls: true,
            autoplay: true,
            responsive: true,
            fluid: true,
            poster,
            sources: [{ src, type: "application/x-mpegURL" }],
        });

        if (onPlay) {
            playerRef.current.on('play', onPlay);
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.dispose();
                playerRef.current = null;
            }
        };
    }, [src, options, isMounted, poster, onPlay]);

    return (
        <div className={className}>
            {isMounted && (
                <video
                    ref={videoRef}
                    poster={poster}
                    className="video-js vjs-default-skin vjs-big-play-centered"
                />
            )}
        </div>
    );
};

export default HLSPlayer;
