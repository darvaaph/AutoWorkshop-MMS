import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';

const useAuth = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/auth/me');
                dispatch(setUser(response.data));
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [dispatch]);

    return { loading, error };
};

export default useAuth;