// This file contains logic for calculating HPP (Harga Pokok Penjualan) using the perpetual moving average method.

const calculateHPP = (currentStock, oldPrice, incomingQty, incomingPrice) => {
    if (currentStock < 0 || incomingQty < 0) {
        throw new Error("Stock quantities must be non-negative.");
    }
    if (currentStock === 0 && incomingQty === 0) {
        return 0; // No stock to calculate HPP
    }
    return ((currentStock * oldPrice) + (incomingQty * incomingPrice)) / (currentStock + incomingQty);
};

module.exports = {
    calculateHPP,
};