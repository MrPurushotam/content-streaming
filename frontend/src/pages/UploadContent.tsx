import { useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import api, { setHeader } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export interface metadataType {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  uniqueId: string;
  userId: number;
  status: string;
  public: boolean;
  uploadTime: string | Date | number;

}

const UploadContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState<string>("");
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const [uniqueId, setUniqueId] = useState<string>("");
  // @ts-ignore
  const [_, setContentId] = useState<string>("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const uniqueIdRef = useRef<string>("");
  const contentIdRef = useRef<number>(0);

  const handleThumbnailUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setThumbnail(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setPreview(null);
  };

  const getPresignedUrl = async () => {
    try {
      const resp = await api.get("/content/createurl");
      if (resp.data.success) {
        uniqueIdRef.current = resp.data.uniqueId
        setUniqueId(resp.data?.uniqueId);
        setHeader('x-unique-id', resp.data?.uniqueId)
        return resp.data.url;
      }
      throw new Error("Couldn't create presigned URL.");
    } catch (error: any) {
      console.log("Error occurred while generating presigned url.", error.message);
      toast({ title: "Couldn't create presigned url.", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const uploadToS3 = async (url: string, file: File) => {
    try {
      await axios.put(url, file, { headers: { "Content-Type": file.type } })
    } catch (error: any) {
      console.log("Error occurred while uploading to S3.", error.message);
      toast({ title: "Couldn't upload file to bucket.", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const saveVideoDetails = async () => {
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("public", isPublic.toString());
      formData.append("uniqueId", uniqueId);
      if (thumbnail) formData.append("thumbnail", thumbnail);

      const resp = await api.post("/content/metadata", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (resp.data.success) {
        console.log(resp.data);
        // setMetadata(resp.data.content);
        contentIdRef.current = resp.data.content?.id
        setContentId(resp.data.content?.id);
        return;
      }
      throw new Error("Couldn't upload content.");

    } catch (error: any) {
      console.log("Error occurred while saving video details.", error.message);
      toast({ title: "Couldn't upload content.", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const confirmUpload = async (uploaded: boolean) => {
    try {
      const resp = await api.post("/content/confirmsource", { uniqueId: uniqueIdRef.current, uploaded, contentId: contentIdRef.current });
      if (!resp.data.success) throw new Error("Confirmation failed.");
      toast({ title: "Success", description: "Upload confirmed." });

    } catch (error: any) {
      console.log("Error occurred while confirming upload.", error.message);
      toast({ title: "Error", description: "Couldn't confirm upload.", variant: "destructive" });
      throw error;
    }
  };

  const uploadVideo = async () => {
    if (!video) {
      toast({ title: "Error", description: "Please select a video.", variant: "destructive" });
      return;
    }
    setLoading("Uploading...");
    setPopupMessage("Starting upload process...");
    setIsPopoverOpen(true);

    try {
      const url = await getPresignedUrl();
      setPopupMessage("Uploading content metadata...");
      await saveVideoDetails();

      setPopupMessage("Uploading video to S3...");
      await uploadToS3(url, video!);

      setPopupMessage("Confirming upload...");
      await confirmUpload(true);

      setPopupMessage("Upload successful!");
      setTimeout(() => {
        setIsPopoverOpen(false);
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      setPopupMessage(`Error: ${error.message}`);
    } finally {
      setHeader('x-unique-id', null)
      setLoading("");
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-gray-50">

      {isPopoverOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-lg w-80 sm:w-96 text-center">
            <p className="text-lg font-semibold">{popupMessage}</p>
            {loading && <p className="text-sm text-gray-500 mt-2">{loading}</p>}
            {!loading && (
              <Button className="mt-4" onClick={() => setIsPopoverOpen(false)}>
                Close
              </Button>
            )}
          </div>
        </div>
      )}

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Upload Content</h2>

      {/* Live Preview Section */}
      <div className="w-full sm:w-3/4 lg:w-1/2 border-2 border-cyan-600 shadow-md shadow-cyan-500 rounded-md my-4 sm:my-7 p-2 flex flex-col sm:flex-row gap-4 items-center">
        <div className="aspect-video w-full sm:w-60 h-40 rounded-md shadow-sm shadow-red-500 bg-gray-200 flex justify-center items-center">
          {preview ? (
            <img src={preview} alt="Thumbnail" className="w-full h-full object-cover rounded-md" />
          ) : (
            <span className="text-gray-500">No Thumbnail</span>
          )}
        </div>
        <div className="w-full h-full rounded-md flex flex-col px-3 py-2 gap-2">
          <p className="text-gray-700 font-semibold">Visibility: {isPublic ? "Public" : "Private"}</p>
          <p className="text-gray-700 font-semibold">Title: {title || "N/A"}</p>
          <p className="text-gray-700 font-semibold">Description: {description || "N/A"}</p>
        </div>
      </div>

      <div className="w-full max-w-lg sm:max-w-2xl lg:max-w-3xl p-4 sm:p-6 md:p-8 bg-white rounded-lg shadow-lg flex flex-col sm:flex-row gap-8 items-start border border-gray-200">
        {/* Thumbnail Upload */}
        <div className="flex flex-col items-center gap-4 w-full sm:w-1/3">
          <label className="text-lg font-semibold text-gray-700">Thumbnail</label>
          {preview ? (
            <div className="relative w-40 h-40 rounded-lg overflow-hidden shadow-md border border-gray-300">
              <img src={preview} alt="Thumbnail Preview" className="w-full h-full object-cover" />
              <button
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                onClick={removeThumbnail}
                disabled={loading.length > 0}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="w-40 h-40 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition">
              <Input type="file" accept="image/*" disabled={loading.length > 0} onChange={handleThumbnailUpload} className="hidden" />
              <span className="text-gray-500">Upload Thumbnail</span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-5 flex-1">
          {/* Public Toggle */}
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-lg font-semibold text-gray-700">Public</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={loading.length > 0} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-1">Title</label>
            <Input type="text" disabled={loading.length > 0} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter video title" className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-1">Description</label>
            <Textarea value={description} disabled={loading.length > 0} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder="Enter video description (max 5000 words)" className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-1">Video</label>
            <Input type="file" disabled={loading.length > 0} accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Upload Button */}
          <Button onClick={uploadVideo} disabled={loading.length > 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-md transition">
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UploadContent;
