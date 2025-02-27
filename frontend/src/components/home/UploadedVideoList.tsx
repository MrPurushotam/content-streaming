import { EllipsisVertical, SquareArrowOutUpRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "../ui/dropdown-menu";
import { Button } from "../ui/button";


export interface UploadedVideoListType {
  id: number;
  thumbnail: string;
  title: string;
  description: string;
  views: number;
  public: boolean;
  status: string;
  manifestUrl: string;
  uploadTime: Date;
  updatedAt?: Date;
  uniqueId?: string;
}

interface UploadedVideoListProps {
  video: UploadedVideoListType;
  onClick: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const UploadedVideoList: React.FC<UploadedVideoListProps> = ({ video, onClick, onEdit, onDelete }) => {
  return (
    <div
      className={`w-full p-1 rounded-md shadow-md flex flex-row gap-2 hover:shadow-lg ${video?.status !== "deleted" ? "hover:shadow-sky-200" : "hover:shadow-red-200"} transition-shadow duration-300`}>

      <div
        className={`w-48 h-32 aspect-video rounded-lg bg-neutral-100/60 border-2 border-neutral-900 p-2 flex justify-center items-center`} onClick={() => onClick(video.id)}>
        <img src={video?.thumbnail || "https://i.pinimg.com/originals/d9/f2/15/d9f21515b1e38d83e94fdbce88f623b6.gif"} alt={video?.title} className="h-full object-cover rounded-lg bg-contain" />
      </div>

      <div className="w-full flex flex-col gap-1 px-1 py-2">
        <div className="flex w-full gap-2 ">
          <span className="flex-1 text-lg font-semibold tracking-wide">{video?.title || "fjs sdkjfsd ksdjf"}</span>
          <div className="flex gap-2 px-3 py-1 items-center">

            <Button onClick={() => onClick(video?.id)} variant={"link"} asChild className="p-1 rounded-md w-7 h-7" disabled={video?.status === "deleted" && !video?.manifestUrl.trim()}>
              <SquareArrowOutUpRight />
            </Button>

            <DropdownMenu >
              <DropdownMenuTrigger asChild disabled={video.status === "deleted"}>
                <EllipsisVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(video?.id)} disabled={video.status === "deleted"} >Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(video?.id)} disabled={video.status === "deleted"} >Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

        <p className="text-sm font-medium tracking-wide">{video?.description || "dfsjdbh dsfkjsd "}</p>

        <div className="flex flex-row gap-2 items-center">
          <span className="rounded-full px-3 py-1 bg-blue-200 text-sm font-bold text-black capitalize">{video?.public ? "public" : "private"}</span>
          <span className="font-bold text-sm bg-green-200 text-bold py-1 px-3 rounded-full">{video?.views} views</span>
          <span className="font-bold text-sm bg-yellow-100 text-black py-1 px-3 rounded-full capitalize">{video?.status || "THing"}</span>
          <span className="font-bold text-sm text-black capitalize">{new Date(video?.uploadTime).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default UploadedVideoList
