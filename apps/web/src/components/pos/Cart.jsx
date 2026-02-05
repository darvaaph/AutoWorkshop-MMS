import React from 'react';
import { useCart } from '../../../hooks/useCart';
import CartItem from './CartItem';

const Cart = () => {
    const { cartItems, totalAmount } = useCart();

    return (
        <div className="cart">
            <h2>Your Cart</h2>
            {cartItems.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <ul>
                    {cartItems.map(item => (
                        <CartItem key={item.id} item={item} />
                    ))}
                </ul>
            )}
            <div className="total">
                <h3>Total: {totalAmount}</h3>
            </div>
        </div>
    );
};

export default Cart;