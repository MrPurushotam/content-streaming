import { useState } from "react";
import { Info, Check, X } from "lucide-react";

export interface UserApprovalTypes {
  id: number;
  username: string;
  email: string;
  role: string;
  approved: boolean;
  createdAt: string;
  fullname: string;
}

interface UserApprovalProps {
  user: UserApprovalTypes;
  onApprovalChange: (id: number, status: boolean) => void;
}

const UserApproval = ({ user, onApprovalChange }: UserApprovalProps) => {
  const [hover, setHover] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);

  const handleApproval = (status: boolean) => {
    console.log(status)
    setChoice(status);
    onApprovalChange(user?.id, status);
  };

  return (
    <div className="flex items-center justify-between w-full p-3 border rounded-lg shadow-sm bg-white hover:shadow-md transition-all">
      <div
        className="relative flex items-center gap-2 cursor-pointer"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span className="text-lg font-semibold">{user.username}</span>
        <Info className="w-4 h-4 text-gray-500" />
        {hover && (
          <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white border rounded-lg shadow-lg z-10">
            <p className="text-sm font-medium">Full Name: {user.fullname}</p>
            <p className="text-sm text-gray-600">Email: {user.email}</p>
            <p className="text-sm text-gray-600">Joined At: {user.createdAt}</p>
          </div>
        )}
      </div>

      {/* Role */}
      <div className="flex flex-row items-center gap-3">
        <span className="text-sm font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full capitalize">
          {user.role}
        </span>

        {/* Approval Buttons */}
        <div className="flex items-center gap-2 rounded-full shadow-md bg-slate-200 p-1">
          <button
            className={`text-green-600 hover:text-green-800 transition-all ${choice === true ? "text-green-800" : ""}`}
            onClick={() => handleApproval(true)}
          >
            <Check className="w-6 h-6" />
          </button>
          <button
            className={`text-red-600 hover:text-red-800 transition-all ${choice === false ? "text-red-800" : ""}`}
            onClick={() => handleApproval(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserApproval;
