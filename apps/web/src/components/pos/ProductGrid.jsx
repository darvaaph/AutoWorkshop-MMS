import React from 'react';

const ProductGrid = ({ products, onAddToCart }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
                <div key={product.id} className="border rounded-lg p-4 shadow-md">
                    <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover mb-2" />
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-gray-600">Price: ${product.price_sell.toFixed(2)}</p>
                    <button 
                        className="mt-2 bg-blue-500 text-white py-2 px-4 rounded"
                        onClick={() => onAddToCart(product)}
                    >
                        Add to Cart
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ProductGrid;