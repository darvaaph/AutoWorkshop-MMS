import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1">
                <Header />
                <main>{children}</main>
            </div>
        </div>
    );
};

export default MainLayout;