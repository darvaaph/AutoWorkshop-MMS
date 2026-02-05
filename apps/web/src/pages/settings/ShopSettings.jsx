import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings } from '../../store/settingsSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ShopSettings = () => {
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings);
    const [formData, setFormData] = useState({
        shop_name: '',
        shop_address: '',
        shop_phone: '',
        footer_message: '',
    });

    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    useEffect(() => {
        if (settings) {
            setFormData({
                shop_name: settings.shop_name,
                shop_address: settings.shop_address,
                shop_phone: settings.shop_phone,
                footer_message: settings.footer_message,
            });
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(updateSettings(formData));
    };

    return (
        <div className="shop-settings">
            <h1>Shop Settings</h1>
            <form onSubmit={handleSubmit}>
                <Input
                    label="Shop Name"
                    name="shop_name"
                    value={formData.shop_name}
                    onChange={handleChange}
                />
                <Input
                    label="Shop Address"
                    name="shop_address"
                    value={formData.shop_address}
                    onChange={handleChange}
                />
                <Input
                    label="Shop Phone"
                    name="shop_phone"
                    value={formData.shop_phone}
                    onChange={handleChange}
                />
                <Input
                    label="Footer Message"
                    name="footer_message"
                    value={formData.footer_message}
                    onChange={handleChange}
                />
                <Button type="submit">Save Settings</Button>
            </form>
        </div>
    );
};

export default ShopSettings;