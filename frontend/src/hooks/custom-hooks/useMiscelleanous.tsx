import { globalLoadingAtom, homeContentAtom } from '@/store/atoms';
import { fetchHomePageData } from '@/store/selectors'
import { useEffect } from 'react'
import { useRecoilState, useRecoilValueLoadable, useSetRecoilState } from 'recoil'

const useMiscelleanous = () => {
    const fetchHomePageDataLoadable = useRecoilValueLoadable(fetchHomePageData);
    const [content, setContent] = useRecoilState(homeContentAtom);
    const setGlobalLoading = useSetRecoilState(globalLoadingAtom);

    useEffect(() => {
        // Set loading state based on the loadable state
        if (fetchHomePageDataLoadable.state === "loading") {
            setGlobalLoading(true);
        } else {
            setGlobalLoading(false);
        }

        if (fetchHomePageDataLoadable.state === "hasValue") {
            const data = fetchHomePageDataLoadable.contents;
            if (!data.success) {
                if (data.error) {
                    console.log("Error message: ", data.error.message);
                }
                console.log(data.message);
                return;
            }
            setContent(data.content);
        } else if (fetchHomePageDataLoadable.state === "hasError") {
            console.error('Most probably network error occured');
            setContent([]);
        }
        
    }, [fetchHomePageDataLoadable, setContent, setGlobalLoading])

    return content;
}

export default useMiscelleanous
