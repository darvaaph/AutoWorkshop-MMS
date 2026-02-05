import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CustomerSearch = ({ onSelectCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchTerm) {
            const fetchCustomers = async () => {
                setLoading(true);
                try {
                    const response = await axios.get(`/api/customers?search=${searchTerm}`);
                    setCustomers(response.data);
                } catch (error) {
                    console.error('Error fetching customers:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchCustomers();
        } else {
            setCustomers([]);
        }
    }, [searchTerm]);

    const handleSelectCustomer = (customer) => {
        onSelectCustomer(customer);
        setSearchTerm('');
        setCustomers([]);
    };

    return (
        <div className="customer-search">
            <input
                type="text"
                placeholder="Search for a customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
            />
            {loading && <div className="loading">Loading...</div>}
            {customers.length > 0 && (
                <ul className="customer-list">
                    {customers.map((customer) => (
                        <li key={customer.id} onClick={() => handleSelectCustomer(customer)}>
                            {customer.name} - {customer.phone}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CustomerSearch;