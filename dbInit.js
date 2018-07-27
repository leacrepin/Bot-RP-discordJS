const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    operatorsAliases: false,
    storage: 'database.sqlite',
});

const CurrencyShop = sequelize.import('models/CurrencyShop');
sequelize.import('models/Users');
sequelize.import('models/UserItems');

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {

    const shop = [
        CurrencyShop.upsert({ name: 'Gaz', cost: 0 }),
        CurrencyShop.upsert({ name: 'Phosphore', cost: 0 }),
        CurrencyShop.upsert({ name: 'Fer', cost: 0 }),
        CurrencyShop.upsert({ name: 'Pierre lumineuse', cost: 0 }),
    ];
    await Promise.all(shop);
    console.log('Database synced');
    sequelize.close();

}).catch(console.error);