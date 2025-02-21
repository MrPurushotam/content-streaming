import { isLoggedInAtom } from '@/store/atoms';
import { Navigate, Outlet } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

const Loggedin = () => {
    const isLoggedIn = useRecoilValue(isLoggedInAtom);
    return (
        <>
            {isLoggedIn ?
                <Outlet />
                :
                <Navigate to="/login" />
            }
        </>
    )
}

export default Loggedin;
