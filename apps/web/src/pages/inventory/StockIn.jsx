import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addStock } from '../../store/inventorySlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const StockIn = () => {
    const dispatch = useDispatch();
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!productId || !quantity || !price) {
            setError('All fields are required');
            return;
        }
        dispatch(addStock({ productId, quantity: parseInt(quantity), price: parseFloat(price) }));
        setProductId('');
        setQuantity('');
        setPrice('');
        setError('');
    };

    return (
        <div className="stock-in">
            <h1>Stock In</h1>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <Input
                    type="text"
                    placeholder="Product ID"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                />
                <Input
                    type="number"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                />
                <Input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <Button type="submit">Add Stock</Button>
            </form>
        </div>
    );
};

export default StockIn;