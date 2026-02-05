import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

const Mechanics = () => {
    const [mechanics, setMechanics] = useState([]);
    const [selectedMechanic, setSelectedMechanic] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchMechanics();
    }, []);

    const fetchMechanics = async () => {
        try {
            const response = await axios.get('/api/mechanics');
            setMechanics(response.data);
        } catch (error) {
            console.error('Error fetching mechanics:', error);
        }
    };

    const handleAddMechanic = () => {
        setSelectedMechanic(null);
        setIsModalOpen(true);
    };

    const handleEditMechanic = (mechanic) => {
        setSelectedMechanic(mechanic);
        setIsModalOpen(true);
    };

    const handleDeleteMechanic = async (id) => {
        try {
            await axios.delete(`/api/mechanics/${id}`);
            fetchMechanics();
        } catch (error) {
            console.error('Error deleting mechanic:', error);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        fetchMechanics();
    };

    return (
        <div>
            <h1>Mechanics Management</h1>
            <Button onClick={handleAddMechanic}>Add Mechanic</Button>
            <Table data={mechanics} onEdit={handleEditMechanic} onDelete={handleDeleteMechanic} />
            {isModalOpen && (
                <Modal onClose={handleModalClose}>
                    {/* Mechanic Form Component would go here */}
                </Modal>
            )}
        </div>
    );
};

export default Mechanics;