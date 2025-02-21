import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { isLoggedInAtom } from "@/store/atoms";

const useSyncLoggedInStatus = () => {
    const setIsLoggedIn = useSetRecoilState(isLoggedInAtom);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, [setIsLoggedIn]);
};

export default useSyncLoggedInStatus;
