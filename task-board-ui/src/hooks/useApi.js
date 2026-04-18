import { useState } from "react";

export default function useApi(apiFunc) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const request = async (...args) => {
        setLoading(true);
        try {
            const res = await apiFunc(...args);
            setData(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    return { data, loading, request };
}