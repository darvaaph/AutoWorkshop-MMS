// package.service.js is responsible for managing package-related logic, including creating, updating, and retrieving package information.

const { Package, PackageItem } = require('../models'); // Import models

class PackageService {
    // Create a new package
    async createPackage(packageData) {
        try {
            const newPackage = await Package.create(packageData);
            return newPackage;
        } catch (error) {
            throw new Error('Error creating package: ' + error.message);
        }
    }

    // Get all packages
    async getAllPackages() {
        try {
            const packages = await Package.findAll({
                include: [{ model: PackageItem, as: 'items' }]
            });
            return packages;
        } catch (error) {
            throw new Error('Error fetching packages: ' + error.message);
        }
    }

    // Get a package by ID
    async getPackageById(packageId) {
        try {
            const pkg = await Package.findByPk(packageId, {
                include: [{ model: PackageItem, as: 'items' }]
            });
            if (!pkg) {
                throw new Error('Package not found');
            }
            return pkg;
        } catch (error) {
            throw new Error('Error fetching package: ' + error.message);
        }
    }

    // Update a package
    async updatePackage(packageId, packageData) {
        try {
            const [updated] = await Package.update(packageData, {
                where: { id: packageId }
            });
            if (!updated) {
                throw new Error('Package not found or no changes made');
            }
            return this.getPackageById(packageId);
        } catch (error) {
            throw new Error('Error updating package: ' + error.message);
        }
    }

    // Delete a package (soft delete)
    async deletePackage(packageId) {
        try {
            const deleted = await Package.destroy({
                where: { id: packageId }
            });
            if (!deleted) {
                throw new Error('Package not found');
            }
            return { message: 'Package deleted successfully' };
        } catch (error) {
            throw new Error('Error deleting package: ' + error.message);
        }
    }
}

module.exports = new PackageService();