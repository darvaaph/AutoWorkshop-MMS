import React, { useEffect, useState } from 'react';
import { fetchServices } from '../../services/api';
import Table from '../../components/common/Table';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getServices = async () => {
            try {
                const data = await fetchServices();
                setServices(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getServices();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Services</h1>
            <Table data={services} />
        </div>
    );
};

export default Services;