// store/selectors.ts
import { selector } from "recoil";
import { isLoggedInAtom } from "./atoms";
import api from "@/lib/api";


export const fetchUserDetailsSelector = selector({
    key: "fetchUserDetails",
    get: async ({ get }) => {
        const token = get(isLoggedInAtom);
        if (token) {

            try {
                const resp = await api.get("user/");
                if (resp.data.success) {
                    return { ...resp.data, role: resp.data.data.role }
                }
                if (resp.data.jwtError) {
                    return { sucess: false, jwtError: true, message: "Jwt Error occured." }
                }
                // @ts-nocheck
            } catch (error: any) {
                console.log(error.message);
                return { success: false, message: "Some error occured.", error }
            }
        } else {
            return { success: false, message: "User is not logged in." }
        }
    }
})


export const fetchHomePageData = selector({
    key: "fetchHomePageData",
    get: async () => {
        try {
            const resp = await api.get("/video/");
            if (resp.data.success) {
                return resp.data;
            } else {
                return { success: false, message: resp.data.message };
            }
        } catch (error: any) {
            return { sucess: false, error: { message: error.message, stack: error.stack } }
        }
    }
})