import React from 'react';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full">
                {children}
            </div>
        </div>
    );
};

export default Layout;