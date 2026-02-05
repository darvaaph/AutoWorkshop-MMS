import React from 'react';

const Header = () => {
    return (
        <header className="bg-gray-800 text-white p-4">
            <h1 className="text-2xl font-bold">AutoWorkshop MMS</h1>
            <nav>
                <ul className="flex space-x-4">
                    <li><a href="/dashboard" className="hover:underline">Dashboard</a></li>
                    <li><a href="/pos" className="hover:underline">POS</a></li>
                    <li><a href="/inventory" className="hover:underline">Inventory</a></li>
                    <li><a href="/transactions" className="hover:underline">Transactions</a></li>
                    <li><a href="/settings" className="hover:underline">Settings</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;