import useLoggedinUser from '@/hooks/custom-hooks/useLoggedinUser';
import useMiscelleanous from '@/hooks/custom-hooks/useMiscelleanous';
import useSyncLoggedInStatus from '@/hooks/custom-hooks/useSyncLoggedInStatus';
import { ReactNode } from 'react';

interface PrimaryWrapperProps {
  children: ReactNode;
}

const PrimaryWrapper = ({ children }: PrimaryWrapperProps) => {
  useSyncLoggedInStatus();
  useLoggedinUser();
  useMiscelleanous();
  return (
    <>
      {children}
    </>
  );
};

export default PrimaryWrapper;
