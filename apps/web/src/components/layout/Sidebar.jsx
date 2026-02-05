import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <h2>AutoWorkshop MMS</h2>
            <ul>
                <li>
                    <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                    <Link to="/pos">POS</Link>
                </li>
                <li>
                    <Link to="/inventory/products">Products</Link>
                </li>
                <li>
                    <Link to="/inventory/services">Services</Link>
                </li>
                <li>
                    <Link to="/inventory/packages">Packages</Link>
                </li>
                <li>
                    <Link to="/transactions">Transactions</Link>
                </li>
                <li>
                    <Link to="/master/customers">Customers</Link>
                </li>
                <li>
                    <Link to="/master/vehicles">Vehicles</Link>
                </li>
                <li>
                    <Link to="/master/mechanics">Mechanics</Link>
                </li>
                <li>
                    <Link to="/finance/expenses">Expenses</Link>
                </li>
                <li>
                    <Link to="/settings/shop">Settings</Link>
                </li>
                <li>
                    <Link to="/audit/logs">Audit Logs</Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;