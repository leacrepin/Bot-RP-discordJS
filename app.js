const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const { Users, CurrencyShop } = require('./dbObjects');
const { Op } = require('sequelize');
const currency = new Discord.Collection();

const client = new Discord.Client();
client.commands = new Discord.Collection();



const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}


Reflect.defineProperty(currency, 'add', {
	value: async function add(id, amount) {
		const user = currency.get(id);
		if (user) {
			user.balance += Number(amount);
			return user.save();
		}
		const newUser = await Users.create({ user_id: id, balance: amount });
		currency.set(id, newUser);
		return newUser;
	},
});

Reflect.defineProperty(currency, 'getBalance', {
	value: function getBalance(id) {
		const user = currency.get(id);
		return user ? user.balance : 0;
	},
});

client.once('ready', async () => {
	const storedBalances = await Users.findAll();
	storedBalances.forEach(b => currency.set(b.user_id, b));
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
    if (message.author.bot) return;
	currency.add(message.author.id, 1);

	if (!message.content.startsWith(prefix)) return;
	const input = message.content.slice(prefix.length).trim();
	if (!input.length) return;
    const [, command, commandArgs] = input.match(/(\w+)\s*([\s\S]*)/);

	try {
		client.commands.get(command).execute(message, args);
	}
	catch (error) {
		if (command === 'balance') {

            const target = message.mentions.users.first() || message.author;
            return message.channel.send(`${target.tag} has ${currency.getBalance(target.id)}💰`);
    
        }
        else if (command === 'inventory') {
    
            const target = message.mentions.users.first() || message.author;
            const user = await Users.findOne({ where: { user_id: target.id } });
            const items = await user.getItems();
    
            if (!items.length) return message.channel.send(`${target.tag} has nothing!`);
            return message.channel.send(`${target.tag} currently has ${items.map(t => `${t.amount} ${t.item.name}`).join(', ')}`);
    
        }
        else if (command === 'transfer') {
    
            const currentAmount = currency.getBalance(message.author.id);
            const transferAmount = commandArgs.split(/ +/).find(arg => !/<@!?\d+>/.test(arg));
            const transferTarget = message.mentions.users.first();
    
            if (!transferAmount || isNaN(transferAmount)) return message.channel.send(`Sorry ${message.author}, that's an invalid amount`);
            if (transferAmount > currentAmount) return message.channel.send(`Sorry ${message.author} you don't have that much.`);
            if (transferAmount <= 0) return message.channel.send(`Please enter an amount greater than zero, ${message.author}`);
    
            currency.add(message.author.id, -transferAmount);
            currency.add(transferTarget.id, transferAmount);
    
            return message.channel.send(`Successfully transferred ${transferAmount}💰 to ${transferTarget.tag}. Your current balance is ${currency.getBalance(message.author.id)}💰`);
    
        }
        else if (command === 'buy') {
    
            const item = await CurrencyShop.findOne({ where: { name: { [Op.like]: commandArgs } } });
            if (!item) return message.channel.send('That item doesn\'t exist.');
            if (item.cost > currency.getBalance(message.author.id)) {
                return message.channel.send(`You don't have enough currency, ${message.author}`);
            }
    
            const user = await Users.findOne({ where: { user_id: message.author.id } });
            currency.add(message.author.id, -item.cost);
            await user.addItem(item);
    
            message.channel.send(`You've bought a ${item.name}`);
    
        }
        else if (command === 'sell') {
    
            const item = await CurrencyShop.findOne({ where: { name: { [Op.like]: commandArgs } } });
            if (!item) return message.channel.send('That item doesn\'t exist.');
    
            const user = await Users.findOne({ where: { user_id: message.author.id } });
            currency.add(message.author.id, -item.cost);
            await user.addItem(item);
            const tagName = commandArgs;

            // equivalent to: UPDATE tags (descrption) values (?) WHERE name='?';
const affectedRows = await UserItems.update({ amount: tagDescription }, { where: { name: tagName } });
if (affectedRows > 0) {
    return message.reply(`Tag ${tagName} was edited.`);
}
return message.reply(`Could not find a tag with name ${tagName}.`);
    
        }
        else if (command === 'shop') {
    
            const items = await CurrencyShop.findAll();
            return message.channel.send(items.map(i => `${i.name}: ${i.cost}💰`).join('\n'), { code: true });
    
        }
        else if (command === 'leaderboard') {
    
            return message.channel.send(
                currency.sort((a, b) => b.balance - a.balance)
                    .filter(user => client.users.has(user.user_id))
                    .first(10)
                    .map((user, position) => `(${position + 1}) ${(client.users.get(user.user_id).tag)}: ${user.balance}💰`)
                    .join('\n'),
                { code: true }
            );
        }
	}
});

client.login(token);
