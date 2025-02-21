import UploadedVideoList from "../components/home/UploadedVideoList";
import UserApproval, { UserApprovalTypes } from "../components/dashboard/userApproval";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { adminUploadedContentAtom, userApproveListAtom, userAtom } from "@/store/atoms";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import Spinner from "@/components/spinner";

// @ts-ignore
let user: UserApprovalTypes = {
  id: 1,
  username: "fdsf",
  email: "Sdfsdf",
  role: "admin",
  approved: false,
  createdAt: Date(),
  fullname: "sdf dfs"
};

interface approveListType {
  id: number;
  status: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingUser, setPendingUser] = useRecoilState<UserApprovalTypes[]>(userApproveListAtom);
  const [uploadedVideo, setUploadedVideo] = useRecoilState(adminUploadedContentAtom);
  const [loading, setLoading] = useState<string>("all");
  const [approveList, setApproveList] = useState<approveListType[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("mix");
  const [filterTime, setFilterTime] = useState<string>("newest");
  const user = useRecoilValue(userAtom);

  const fetchUploadedVideo = async () => {
    setLoading("video");
    try {
      const resp = await api.get("/user/uploads");
      if (resp.data.success) {
        setUploadedVideo(resp.data.content);
      } else {
        toast({ title: "Error", description: resp.data.message });
      }
    } catch (error: any) {
      console.log(error.message);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading("");
    }
  };

  const fetchPendingUserList = async (len: number = 20, page: number = 1, type: string = "admin") => {
    setLoading("list");
    try {
      const resp = await api.get(`/user/list/${type}`, {
        params: { page, limit: len }
      });

      if (resp.data.success) {
        setPendingUser(resp.data.list);
      } else {
        toast({ title: "Error", description: resp.data.error });
      }
    } catch (error: any) {
      console.error(error.message);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading("");
    }
  };

  const handleApprovalChange = (id: number, status: boolean) => {
    setApproveList((prevList) => {
      const existingIndex = prevList.findIndex((item) => item.id === id);
      if (existingIndex !== -1) {
        const updatedList = [...prevList];
        updatedList[existingIndex].status = status;
        return updatedList;
      }
      return [...prevList, { id, status }];
    });
  };

  const updateApprovalStatus = async () => {
    setLoading("updatelist");
    console.log("Approve List", approveList);
    try {
      const resp = await api.post("/user/approve", { approveList });
      if (resp.data.success) {
        toast({ title: "Success", description: "User statuses updated successfully." });
        fetchPendingUserList();
      } else {
        toast({ title: "Error", description: resp.data.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error(error.message);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading("");
    }
  };

  useEffect(() => {
    setLoading("all");
    fetchUploadedVideo();
    fetchPendingUserList();
    setLoading("");
  }, []);

  const openVideo = async (id: number = 11) => {
    navigate(`/watch/${id}`);
  };
  const deleteUploadedVideo = async (id: number) => {
    try {
      const resp = await api.delete(`/video/${id}`);
      if (resp.data.success) {
        setUploadedVideo((videos) =>
          videos.map((vid) => (vid.id === id ? { ...vid, status: "deleted" } : vid))
        );
        toast({ title: "Success", description: "Video status updated to deleted successfully." });
      }
    } catch (error: any) {
      toast({ title: "Couldn't update video status.", description: error.message, variant: "destructive" });
    }
  };

  const editUploadedVideo = async (id: number) => {
    navigate(`/upload/edit/${id}`)
  }

  const filteredVideos = uploadedVideo
    .filter((video) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "mix") return video.status === "published" || video.status === "processing";
      return video.status === filterStatus;
    })
    .sort((a, b) => {
      if (filterTime === "newest") {
        return new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime();
      } else {
        return new Date(a.uploadTime).getTime() - new Date(b.uploadTime).getTime();
      }
    });
    console.log(user)
  return (
    <div className="w-full h-[93vh] flex flex-col items-center p-4">
      {loading === "all" ? (
        <Spinner />
      ) : (
        <>
          <h2 className="font-bold text-2xl my-7">Hello Admin - {user?.username}</h2>
          <div className="grid w-full h-full rounded-lg p-2">
            <div className="grid grid-cols-[2fr_1fr] gap-4 h-[80vh]">
              <div className="col-span-1 overflow-auto bg-gray-200 flex flex-col items-center px-2 py-3">
                <div className="w-full flex justify-between items-center">
                  <Button onClick={() => navigate("/upload")} className="bg-green-300 hover:bg-green-400 shadow-md font-bold text-black">Upload Video</Button>
                  <h2 className="text-2xl font-bold my-3">Your Videos</h2>
                  <div className="flex gap-2">
                    <Select onValueChange={(value) => setFilterTime(value)}>
                      <SelectTrigger className="w-[150px] bg-white">
                        <SelectValue placeholder="Filter by Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select onValueChange={(value) => setFilterStatus(value)}>
                      <SelectTrigger className="w-[150px] bg-white">
                        <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="mix">Published | Processing</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="deleted">Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="font w-full h-full p-2 space-y-1 overflow-x-hidden overflow-y-auto">
                  {loading === "video" && (
                    <div className="w-full flex justify-center items-center">
                      <Spinner />
                    </div>
                  )}
                  {filteredVideos.length === 0 && (
                    <div className="w-full p-2 flex justify-center items-center z-10">
                      <span className="text-amber-700 text-sm font-bold tracking-wide capitalize">No videos uploaded.</span>
                    </div>
                  )}
                  {filteredVideos?.map((video) => (
                    // @ts-ignore
                    <UploadedVideoList key={video.id} video={video}
                      onClick={() => {
                        if (video.status === "deleted") return;
                        openVideo(video.id)
                      }
                      } onEdit={() => editUploadedVideo(video.id)} onDelete={() => deleteUploadedVideo(video.id)} />
                  ))}
                </div>
              </div>

              <div className="col-span-1 overflow-auto bg-gray-200 flex flex-col items-center px-2 py-3">
                <h2 className="text-2xl font-bold my-3">Approve New Admin</h2>
                <div className="font w-full flex-1 overflow-y-auto overflow-x-hidden p-2 rounded-md space-y-1">
                  {loading === "list" || loading === "updatelist" && (
                    <div className="w-full flex justify-center items-center">
                      <Spinner />
                    </div>
                  )}
                  {pendingUser?.map((user: UserApprovalTypes) => {
                    return (
                      <UserApproval key={user.id} user={user} onApprovalChange={handleApprovalChange} />
                    )
                  })}
                  {pendingUser.length === 0 && (
                    <div className="w-full p-2 flex justify-center items-center">
                      <span className="text-amber-700 text-sm font-bold tracking-wide capitalize">No user request pending.</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full shadow-md shadow-sky-100 bg-sky-400 my-2 text-lg font-bold tracking-wide uppercase hover:bg-sky-500"
                  onClick={updateApprovalStatus}
                  disabled={approveList?.length < 1 || loading === "updatelist"}
                >
                  {loading === "updatelist" ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
