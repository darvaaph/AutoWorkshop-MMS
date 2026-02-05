import React from 'react';

const Input = ({ label, type = 'text', value, onChange, placeholder, required = false }) => {
    return (
        <div className="input-container">
            {label && <label className="input-label">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="input-field"
            />
        </div>
    );
};

export default Input;