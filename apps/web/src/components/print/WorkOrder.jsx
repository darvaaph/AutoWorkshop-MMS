import React from 'react';

const WorkOrder = ({ workOrder }) => {
    return (
        <div className="work-order">
            <h1>Work Order</h1>
            <div className="work-order-details">
                <h2>Customer Information</h2>
                <p>Name: {workOrder.customer.name}</p>
                <p>Phone: {workOrder.customer.phone}</p>
                <p>Address: {workOrder.customer.address}</p>

                <h2>Vehicle Information</h2>
                <p>License Plate: {workOrder.vehicle.license_plate}</p>
                <p>Brand: {workOrder.vehicle.brand}</p>
                <p>Model: {workOrder.vehicle.model}</p>
                <p>Current KM: {workOrder.vehicle.current_km}</p>

                <h2>Services and Packages</h2>
                <ul>
                    {workOrder.items.map((item, index) => (
                        <li key={index}>
                            {item.item_type}: {item.item_name} - Qty: {item.qty} - Price: {item.sell_price}
                        </li>
                    ))}
                </ul>

                <h2>Total Amount</h2>
                <p>{workOrder.total_amount}</p>
            </div>
        </div>
    );
};

export default WorkOrder;