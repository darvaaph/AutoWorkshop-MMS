import React from 'react';

const Receipt = ({ transaction }) => {
    const { customer, vehicle, items, totalAmount, date } = transaction;

    return (
        <div className="receipt">
            <h1>Receipt</h1>
            <p>Date: {new Date(date).toLocaleString()}</p>
            <h2>Customer Information</h2>
            <p>Name: {customer.name}</p>
            <p>Phone: {customer.phone}</p>
            <h2>Vehicle Information</h2>
            <p>License Plate: {vehicle.license_plate}</p>
            <h2>Items</h2>
            <ul>
                {items.map((item, index) => (
                    <li key={index}>
                        {item.item_name} - Qty: {item.qty} - Price: {item.sell_price}
                    </li>
                ))}
            </ul>
            <h2>Total Amount: {totalAmount}</h2>
        </div>
    );
};

export default Receipt;