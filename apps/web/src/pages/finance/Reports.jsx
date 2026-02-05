import React, { useEffect, useState } from 'react';
import { fetchFinancialReports } from '../../services/api';
import Table from '../../components/common/Table';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getReports = async () => {
            try {
                const data = await fetchFinancialReports();
                setReports(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getReports();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Financial Reports</h1>
            <Table data={reports} />
        </div>
    );
};

export default Reports;