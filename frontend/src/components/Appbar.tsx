import { useToast } from "@/hooks/use-toast";
import { isAdminAtom, isLoggedInAtom } from "@/store/atoms";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";

const Appbar = () => {
    const navigate = useNavigate();
    const isLoggedIn = useRecoilValue(isLoggedInAtom);
    const isAdmin = useRecoilValue(isAdminAtom);
    const { toast } = useToast();
    return (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-gray-100 text-black dark:bg-gray-900 dark:text-white w-full shadow-md z-10">
            {/* Brand Name */}
            <div className="hidden md:inline"></div>
            <h1 className="pl-12 md:pl-0 text-2xl font-bold tracking-wider text-sky-400 cursor-pointer uppercase flex items-center gap-1" onClick={()=>navigate("/")}>
                <img src="/favicon.ico" alt="Stream" className="h-10 w-10 cursor-pointer"/>
                Stream
            </h1>

            <User
                className={`h-7 w-7 cursor-pointer ${isAdmin ? "hover:text-sky-400" : "hover:text-red-500"} transition-colors duration-200`}
                onClick={() => {
                    if (isAdmin) {
                        navigate('/dashboard');
                    }
                    else if (!isLoggedIn) {
                        navigate('/login');
                    }
                    else {
                        toast({ title: "You don't have the access.", description: "Only admin's can access dashboard." })
                    }
                }}
            />
        </div>
    );
};

export default Appbar;
