import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loading from '../../components/common/Loading';
import { formatCurrency } from '../../utils/formatters';

const TransactionDetail = () => {
    const { id } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactionDetail = async () => {
            try {
                const response = await api.get(`/transactions/${id}`);
                setTransaction(response.data);
            } catch (error) {
                console.error('Error fetching transaction details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactionDetail();
    }, [id]);

    if (loading) {
        return <Loading />;
    }

    if (!transaction) {
        return <div>No transaction found.</div>;
    }

    return (
        <div>
            <h1>Transaction Detail</h1>
            <p><strong>Date:</strong> {new Date(transaction.date).toLocaleString()}</p>
            <p><strong>Status:</strong> {transaction.status}</p>
            <p><strong>Subtotal:</strong> {formatCurrency(transaction.subtotal)}</p>
            <p><strong>Discount:</strong> {formatCurrency(transaction.discount_amount)}</p>
            <p><strong>Total:</strong> {formatCurrency(transaction.total_amount)}</p>
            <h2>Items</h2>
            <ul>
                {transaction.transaction_items.map(item => (
                    <li key={item.id}>
                        {item.item_name} - {item.qty} x {formatCurrency(item.sell_price)}
                    </li>
                ))}
            </ul>
            <h2>Notes</h2>
            <p>{transaction.notes}</p>
        </div>
    );
};

export default TransactionDetail;