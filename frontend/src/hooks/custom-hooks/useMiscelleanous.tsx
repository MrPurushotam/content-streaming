import { homeContentAtom } from '@/store/atoms';
import { fetchHomePageData } from '@/store/selectors'
import { useEffect } from 'react'
import { useRecoilState, useRecoilValueLoadable } from 'recoil'

const useMiscelleanous = () => {
    const fetchHomePageDataLoadable = useRecoilValueLoadable(fetchHomePageData);
    const [content, setContent] = useRecoilState(homeContentAtom);

    useEffect(() => {
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

    }, [fetchHomePageDataLoadable, setContent])

    return content;
}

export default useMiscelleanous
