import React, { useState } from 'react';

const PaymentModal = ({ isOpen, onClose, onSubmit }) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ amount: parseFloat(amount), paymentMethod });
        onClose();
    };

    return (
        isOpen && (
            <div className="modal">
                <div className="modal-content">
                    <h2>Payment</h2>
                    <form onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="amount">Amount:</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="paymentMethod">Payment Method:</label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="TRANSFER">Transfer</option>
                            </select>
                        </div>
                        <button type="submit">Submit Payment</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </form>
                </div>
            </div>
        )
    );
};

export default PaymentModal;