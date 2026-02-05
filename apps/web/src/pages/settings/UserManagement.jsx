import React, { useEffect, useState } from 'react';
import { fetchUsers, deleteUser } from '../../services/api';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            const userList = await fetchUsers();
            setUsers(userList);
        };
        loadUsers();
    }, []);

    const handleDelete = async (userId) => {
        await deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
    };

    const openModal = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedUser(null);
        setIsModalOpen(false);
    };

    return (
        <div>
            <h1>User Management</h1>
            <Button onClick={() => openModal(null)}>Add User</Button>
            <Table data={users} onEdit={openModal} onDelete={handleDelete} />
            {isModalOpen && (
                <Modal onClose={closeModal}>
                    {/* User form component can be added here */}
                    <h2>{selectedUser ? 'Edit User' : 'Add User'}</h2>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;