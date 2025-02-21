import React from "react";
import { Menu, Eye, Info, History, Upload, LogIn, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router-dom";
import { SidebarFooter, SidebarGroupContent } from "./ui/sidebar";
import { useRecoilState, useRecoilValue } from "recoil";
import { isAdminAtom, isLoggedInAtom, sidebarToggleAtom } from "@/store/atoms";
import useLogout from "@/hooks/custom-hooks/useLogout";

interface SidebarContentProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

interface SidebarItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  isSidebarOpen: boolean;
  onClick?: () => void;
}

const CustomSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useRecoilState(sidebarToggleAtom);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-8 w-8 " />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent isSidebarOpen={true} toggleSidebar={toggleSidebar} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex fixed z-20 top-0 left-0 h-full ${isSidebarOpen ? "w-64" : "w-16"
          } flex-col border-r transition-all duration-300 bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200`}
      >
        <SidebarContent
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      </div>
    </>
  );
};

const SidebarContent: React.FC<SidebarContentProps> = ({
  isSidebarOpen,
  toggleSidebar,
}) => {
  const navigate = useNavigate();
  const isLoggedIn = useRecoilValue(isLoggedInAtom);
  const isAdmin = useRecoilValue(isAdminAtom);
  const logout = useLogout();
  return (
    <div
      className={`flex h-full flex-col p-4 bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200`}
    >
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="mb-4"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Separator />

      {/* Sidebar Menu */}
      <SidebarGroupContent className="flex-1 space-y-4 mt-4">
        <SidebarItem
          to="/"
          icon={<Eye />}
          label="Watch"
          isSidebarOpen={isSidebarOpen}
        />
        <SidebarItem
          to="/aboutdev"
          icon={<Info />}
          label="About Dev"
          isSidebarOpen={isSidebarOpen}
        />
        <SidebarItem
          to="/history"
          icon={<History />}
          label="History"
          isSidebarOpen={isSidebarOpen}
        />

        {(isLoggedIn && isAdmin) && <SidebarItem
          to="/upload"
          icon={<Upload />}
          label="Upload"
          isSidebarOpen={isSidebarOpen}
        />}

      </SidebarGroupContent>
      <SidebarFooter className="mt-4 w-full h-14 flex justify-start items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={isLoggedIn ? logout : () => navigate("/login")}
          className="w-full h-full flex justify-start items-center hover:bg-gray-300 dark:hover:bg-gray-800"
        >
          <div className="flex justify-center items-center h-full p-1">
            {isLoggedIn ? (
              <LogOut className="text-red-500 font-bold text-2xl" />
            ) : (
              <LogIn />
            )}
          </div>
          {isSidebarOpen && <span className={`text-lg font-semibold tracking-wide ml-3 ${isLoggedIn?"text-red-500":"text-cyan-500"}`}>{isLoggedIn ? "Logout" : "Login"}</span>}
        </Button>
      </SidebarFooter>
    </div>
  );
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  to = "#",
  icon,
  label,
  isSidebarOpen,
}) => {
  return (
    <Link
      to={to}
      className={`text-lg flex items-center p-2 rounded transition-colors hover:bg-gray-300 dark:hover:bg-gray-800`}
    >
      {icon}
      {isSidebarOpen && <span className="ml-3">{label}</span>}
    </Link>
  );
};

export default CustomSidebar;
