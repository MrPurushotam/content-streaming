import UploadedVideoList from "../components/home/UploadedVideoList";
import UserApproval from "../components/dashboard/userApproval";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { adminUploadedContentAtom, userApproveListAtom, userAtom } from "@/store/atoms";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import Spinner from "@/components/spinner";
import Seo from '../components/seo/seo';
import { ImageUp, X } from "lucide-react";
import useLogout from "@/hooks/custom-hooks/useLogout";

interface approveListType {
  id: number;
  status: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingUser, setPendingUser] = useRecoilState(userApproveListAtom);
  const [uploadedVideo, setUploadedVideo] = useRecoilState(adminUploadedContentAtom);
  const [loading, setLoading] = useState<string>("all");
  const [approveList, setApproveList] = useState<approveListType[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("mix");
  const [filterTime, setFilterTime] = useState<string>("newest");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const user = useRecoilValue(userAtom);
  const logout = useLogout();
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
    try {
      const resp = await api.put("/user/approve", { approveList });
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
    const checkJwtError = async () => {
      try {
        const resp = await api.get("/user/");
        if (!resp.data.success) {
          logout("Some error occured.");
        }
      } catch (error: any) {
        if (error.response && error.response.data && error.response.data.jwtError) {
          logout("Jwt token expired/not foudn. Please login again.");
        } else {
          console.error("Error occurred", error.message);
        }
      }
    };
    checkJwtError();
  }, [logout]);

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

  return (
    <div className="w-full min-h-svh flex flex-col items-center bg-gray-50 ">
      <Seo
        title="Dashboard"
        description="Admin dashboard for managing videos and user approvals."
        keywords="dashboard, admin, videos, user approvals"
        name="Stream by Purushotam"
        type="website"
        address={'/dashboard'}
      />
      {loading === "all" ? (
        <Spinner />
      ) : (
        <>
          <h2 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl pt-7 pb-3">Hello Admin - {user?.username}</h2>
          <div className="grid w-full h-full rounded-lg p-2">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 h-[80vh]">
              <div className="col-span-1 overflow-auto bg-gray-200 flex flex-col items-center px-2 py-3 rounded-lg shadow-md">
                <div className="w-full flex flex-row justify-between items-center mb-4">

                  <Button onClick={() => navigate("/upload")} className="flex gap-1 md:hidden bg-green-300 hover:bg-green-400 shadow-md font-bold text-black mb-2 sm:mb-0 text-sm sm:text-sm md:text-base lg:text-lg">
                    <ImageUp className="w-12 h-12 " />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>

                  <Button onClick={() => navigate("/upload")} className="hidden md:inline bg-green-300 hover:bg-green-400 shadow-md font-bold text-black mb-2 sm:mb-0 text-sm sm:text-sm md:text-base lg:text-lg">Upload Video</Button>

                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold my-3">Your Videos</h2>
                  <div className="flex gap-2">
                    <Select onValueChange={(value) => setFilterTime(value)}>
                      <SelectTrigger className="w-[40px] md:w-[120px] bg-white flex justify-center items-center">
                        <SelectValue placeholder="Filter by Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select onValueChange={(value) => setFilterStatus(value)}>
                      <SelectTrigger className="w-[40px] md:w-[120px] bg-white flex justify-center items-center">
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
                    <UploadedVideoList key={video.id} video={video}
                      onClick={() => {
                        if (video.status === "deleted") return;
                        openVideo(video.id)
                      }
                      } onEdit={() => editUploadedVideo(video.id)} onDelete={() => deleteUploadedVideo(video.id)} />
                  ))}
                </div>
              </div>

              <div className="hidden lg:flex col-span-1 flex-col items-center px-2 py-3 bg-gray-200 rounded-md">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold my-3">Approve New Admin</h2>
                <div className="font w-full flex-1 overflow-y-auto overflow-x-hidden p-2 rounded-md space-y-1">
                  {loading === "list" || loading === "updatelist" && (
                    <div className="w-full flex justify-center items-center">
                      <Spinner />
                    </div>
                  )}
                  {pendingUser?.map((user) => {
                    return (
                      // @ts-ignore
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
                  className="w-full shadow-md shadow-sky-100 bg-sky-400 my-2 text-sm sm:text-base md:text-lg font-bold tracking-wide uppercase hover:bg-sky-500"
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

      {/* Right Side Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 flex items-end justify-end z-50">
          <div className="bg-white w-full sm:w-3/4 md:w-1/2 lg:w-1/3 h-full shadow-lg p-4 sm:p-6 md:p-8 overflow-auto flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Approve New Admin</h2>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => setIsDrawerOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="font w-full flex-1 overflow-y-auto overflow-x-hidden p-2 rounded-md space-y-1 mt-7">
              {loading === "list" || loading === "updatelist" && (
                <div className="w-full flex justify-center items-center">
                  <Spinner />
                </div>
              )}
              {pendingUser?.map((user) => {
                return (
                  // @ts-ignore
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
              className="w-full shadow-md shadow-sky-100 bg-sky-400 my-2 text-sm sm:text-base md:text-lg font-bold tracking-wide uppercase hover:bg-sky-500"
              onClick={updateApprovalStatus}
              disabled={approveList?.length < 1 || loading === "updatelist"}
            >
              {loading === "updatelist" ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      )}

      {/* Button for small screens */}
      <div className="lg:hidden fixed bottom-4 right-8">
        <Button
          className="shadow-md shadow-sky-100 bg-sky-400 text-xs md:text-sm font-semibold md:font-bold tracking-wide uppercase hover:bg-sky-500"
          onClick={() => setIsDrawerOpen(true)}
        >
          Approve New Admin
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
