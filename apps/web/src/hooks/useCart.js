import { useState, useEffect } from 'react';

const useCart = () => {
    const [cartItems, setCartItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        const calculateTotal = () => {
            const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
            setTotalAmount(total);
        };

        calculateTotal();
    }, [cartItems]);

    const addItemToCart = (item) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((cartItem) => cartItem.id === item.id);
            if (existingItem) {
                return prevItems.map((cartItem) =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
                        : cartItem
                );
            }
            return [...prevItems, { ...item, quantity: item.quantity }];
        });
    };

    const removeItemFromCart = (itemId) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    return {
        cartItems,
        totalAmount,
        addItemToCart,
        removeItemFromCart,
        clearCart,
    };
};

export default useCart;