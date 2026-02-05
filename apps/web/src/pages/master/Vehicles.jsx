import React, { useEffect, useState } from 'react';
import { fetchVehicles } from '../../services/api';
import Table from '../../components/common/Table';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getVehicles = async () => {
            try {
                const data = await fetchVehicles();
                setVehicles(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getVehicles();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Vehicles Management</h1>
            <Table data={vehicles} />
        </div>
    );
};

export default Vehicles;