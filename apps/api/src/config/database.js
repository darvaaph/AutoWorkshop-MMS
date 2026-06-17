require('dotenv').config();
const { Sequelize } = require('sequelize');

// Use a dedicated database when running tests so dev/prod data is never touched.
// Jest sets NODE_ENV=test automatically; the test DB is `<DB_NAME>_test`.
const isTest = process.env.NODE_ENV === 'test';
const databaseName = isTest ? `${process.env.DB_NAME}_test` : process.env.DB_NAME;

const sequelize = new Sequelize(
    databaseName,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        timezone: '+07:00',
        dialectOptions: {
            timezone: '+07:00',
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ Database Connected to MariaDB [${databaseName}]`);
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        process.exit(1);
    }
};

module.exports = {
    sequelize,
    connectToDatabase,
};