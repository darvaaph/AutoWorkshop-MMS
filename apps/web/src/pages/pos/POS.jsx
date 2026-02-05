import React from 'react';
import Cart from '../../components/pos/Cart';
import ProductGrid from '../../components/pos/ProductGrid';
import PaymentModal from '../../components/pos/PaymentModal';
import CustomerSearch from '../../components/pos/CustomerSearch';

const POS = () => {
    return (
        <div className="pos-page">
            <h1>Point of Sale</h1>
            <CustomerSearch />
            <ProductGrid />
            <Cart />
            <PaymentModal />
        </div>
    );
};

export default POS;