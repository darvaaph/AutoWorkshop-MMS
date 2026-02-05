import React, { useEffect, useState } from 'react';
import { fetchPackages } from '../../services/api';
import Table from '../../components/common/Table';
import Loading from '../../components/common/Loading';

const Packages = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getPackages = async () => {
            try {
                const data = await fetchPackages();
                setPackages(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getPackages();
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Packages Management</h1>
            <Table data={packages} />
        </div>
    );
};

export default Packages;