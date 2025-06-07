import api from '@/lib/api';
import { adminUploadedContentAtom, editContentAtom, isAdminAtom, isLoggedInAtom, userApproveListAtom, userAtom } from '@/store/atoms';
import { fetchUserDetailsSelector } from '@/store/selectors';
import { useCallback } from 'react';
import { useRecoilRefresher_UNSTABLE, useResetRecoilState } from 'recoil';
import { useToast } from '../use-toast';
import { useNavigate } from 'react-router-dom';

const useLogout = () => {
    const { toast } = useToast();
    const resetLoggedIn = useResetRecoilState(isLoggedInAtom);
    const resetUser = useResetRecoilState(userAtom);
    const resetIsAdmin = useResetRecoilState(isAdminAtom);
    const resetUseApprovalList = useResetRecoilState(userApproveListAtom);
    const resetAdminUploadedContent = useResetRecoilState(adminUploadedContentAtom);
    const resetAdminEditContent = useResetRecoilState(editContentAtom);
    const resetFetchUserDetail = useRecoilRefresher_UNSTABLE(fetchUserDetailsSelector)
    const navigate = useNavigate();

    const logout = useCallback(async (customMessage?: string) => {
        try {
            await api.get("/user/logout")
            window.localStorage.removeItem("token");
            window.localStorage.removeItem("adminToken");
            resetIsAdmin();
            resetUseApprovalList();
            resetAdminEditContent();
            resetAdminUploadedContent();
            resetFetchUserDetail();
            resetUser();
            resetLoggedIn();
            navigate("/")
        } catch (error: any) {
            console.log("Unfortunate error occurred.", error.message)
            toast({ title: "Error while logging out.", description: error.message, variant: "destructive" })
        } finally {            
            toast({ title: "Logged out.", description: customMessage || "You are logged out." })
        }
    }, [resetAdminEditContent, resetAdminUploadedContent, resetFetchUserDetail, resetIsAdmin, resetLoggedIn, resetUseApprovalList, resetUser, toast, navigate])

    return logout;
}

export default useLogout;
