import { isLoggedInAtom } from '@/store/atoms'
import { Navigate, Outlet } from 'react-router-dom';
import { useRecoilValue } from 'recoil'

const HideLogin = () => {
    const isLoggedin = useRecoilValue(isLoggedInAtom);
    return (
        <>
            {!isLoggedin ? <Outlet /> : <Navigate to="/" />}
        </>
    )
}

export default HideLogin
