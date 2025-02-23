import useLoggedinUser from '@/hooks/custom-hooks/useLoggedinUser';
import useMiscelleanous from '@/hooks/custom-hooks/useMiscelleanous';
import useSyncLoggedInStatus from '@/hooks/custom-hooks/useSyncLoggedInStatus';
import { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';

interface PrimaryWrapperProps {
  children: ReactNode;
}

const PrimaryWrapper = ({ children }: PrimaryWrapperProps) => {
  useSyncLoggedInStatus();
  useLoggedinUser();
  useMiscelleanous();
  return (
    <HelmetProvider>
      {children}
    </HelmetProvider>
  );
};

export default PrimaryWrapper;
