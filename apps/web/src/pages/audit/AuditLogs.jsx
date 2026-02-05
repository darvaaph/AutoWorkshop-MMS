import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../../services/api';
import Table from '../../components/common/Table';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getAuditLogs = async () => {
            try {
                const response = await fetchAuditLogs();
                setLogs(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getAuditLogs();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Audit Logs</h1>
            <Table data={logs} />
        </div>
    );
};

export default AuditLogs;