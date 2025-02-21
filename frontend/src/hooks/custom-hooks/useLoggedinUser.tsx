import { isAdminAtom, userAtom } from '@/store/atoms'
import { fetchUserDetailsSelector } from '@/store/selectors'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilState, useRecoilValueLoadable, useSetRecoilState } from 'recoil'

const useLoggedinUser = () => {
    const [user, setUser] = useRecoilState(userAtom);
    const setIsAdmin = useSetRecoilState(isAdminAtom);
    const fetchUserLoadable = useRecoilValueLoadable(fetchUserDetailsSelector);
    const navigate = useNavigate();

    useEffect(() => {
        if (fetchUserLoadable.state === "hasValue") {
            const data = fetchUserLoadable.contents;
            if (!data.success) {
                if (data.jwtError) {
                    window.localStorage.removeItem("token");
                    navigate("/login");
                } else {
                    console.error(data.error || data.message);
                }
                return;
            }
            setUser(data.user);
            setIsAdmin(data.role === "admin");
        }
        // THOUGHT: Here i want to add a way such that on error we recurssevily fetch detail ones we get it we end the recuresion there
        else if (fetchUserLoadable.state === "hasError") {
            console.error('Error loading user details:', fetchUserLoadable.contents);
            setUser(null);
        }

    }, [fetchUserLoadable, setUser, navigate, setIsAdmin]);

    return user;
}

export default useLoggedinUser
