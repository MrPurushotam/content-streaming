import Appbar from "../Appbar";
import { ReactNode } from "react";
import CustomSidebar from "../Sidebar";

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex flex-row flex-grow">
                <CustomSidebar /> {/* Add CustomSidebar */}
                <div className="flex flex-col flex-grow">
                    <Appbar />
                    <main className="flex-1 pt-16 pl-16">{children}</main> {/* Add top padding */}
                </div>
            </div>
        </div>
    );
};

export default Layout;
