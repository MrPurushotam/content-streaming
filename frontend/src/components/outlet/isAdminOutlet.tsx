import { isAdminAtom } from '@/store/atoms'
import { Navigate, Outlet } from 'react-router-dom';
import { useRecoilValue } from 'recoil'

const IsAdminOutlet = () => {
    const isAdmin = useRecoilValue(isAdminAtom);
    return (
        <>
            {
                isAdmin ?
                    <Outlet />
                    :
                    <Navigate to="/" />
            }
        </>
    )
}

export default IsAdminOutlet
