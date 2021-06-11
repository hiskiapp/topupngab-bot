require('dotenv').config();
const { ray } = require('node-ray');
const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const axios = require('axios');
const port = process.env.APP_PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const sequelize = require('./config/database');
const models = require("./models/init-models");
const db = models(sequelize);

const { phoneNumberFormatter } = require('./helpers/formatter');

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: __dirname
    });
});

const SESSION_FILE_PATH = './whatsapp-session.json';
let whatsapp_session;
if (fs.existsSync(SESSION_FILE_PATH)) {
  whatsapp_session = require(SESSION_FILE_PATH);
}

const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
            ],
        },
        session: whatsapp_session
    });

client.on('message', msg => {
    let customer, newCustomer;
    msg.getContact().then(async response => {
        ray(response);
        [customer, newCustomer] = await db.customers.findOrCreate({
            where: {
                number: response.number
            },
            defaults: {
                name: response.name ? response.name : '-',
                is_business: response.isBusiness,
                created_at: new Date(),
            }
        });
    });

    const message = msg.body.split(' ');
    switch (message[0]) {
        case '!help': {
            msg.reply(`Command list *@topup.ngab* bot:\n\n*!subscribe*: Subscribe pemberitahuan atau promo-promo menarik\n\n*!unsubscribe*: Unsubscribe pemberitahuan atau promo-promo menarik`);
            break;
        }
        case '!subscribe': {
            db.customers.update({
                is_subscribe: 1,
            }, {
                where: {
                    id: customer.id
                }
            });
            msg.reply(`Terimakasih telah berlangganan info-info promo menarik dari kami!`);
            break;
        }
        case '!unsubscribe': {
            db.customers.update({
                is_subscribe: 0,
            }, {
                where: {
                    id: customer.id
                }
            });
            msg.reply(`Berhasil unsubscribe!`);
            break;
        }
        default:
        break;
    }
});

client.initialize();

io.on('connection', function (socket) {
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, scan please!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('message', 'Whatsapp is authenticated!');

        whatsapp_session = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
            if (err) {
                console.error(err);
            }
        });

        db.settings.update({
            value: 'Connected',
        }, {
            where: {
                slug: 'whatsapp_session'
            }
        });

        console.log('Whatsapp is authenticated!');
    });

    client.on('auth_failure', function (session) {
        socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
        socket.emit('disconnected', 'Whatsapp disconnected!');

        fs.unlinkSync(SESSION_FILE_PATH, function(err) {
            if(err) return console.log(err);
            console.log('Session file deleted!');
        });

        db.settings.update({
            value: 'Disconnected'
        }, {
            where: {
                slug: 'whatsapp_session'
            }
        });

        console.log('Whatsapp disconnected!');

        client.destroy();
        client.initialize();
    });
});

const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);

    return isRegistered;
}

const validateApiToken = async (token) => {
    return await db.settings.findOne({
        where: {
            slug: 'token',
            value: token,
        },
    });
};

app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
    body('token').notEmpty(),
    ], async (req, res) => {
        const errors = validationResult(req).formatWith(({
            message
        }) => {
            return message;
        });

        if (!errors.isEmpty()) {
            return res.status(422).json({
                status: false,
                message: errors.mapped()
            });
        }

        const isValid = await validateApiToken(req.body.token);

        if (!isValid) {
            return res.status(403).json({
                status: false,
                message: 'The api token is invalid.'
            });
        }

        const number = phoneNumberFormatter(req.body.number);
        const message = req.body.message;

        const isRegisteredNumber = await checkRegisteredNumber(number);
        if (!isRegisteredNumber) {
            return res.status(422).json({
                status: false,
                message: 'The number is not registered.'
            });
        }

        client.sendMessage(number, message).then(response => {
            res.status(200).json({
                status: true,
                message: 'success',
                response: response
            });
        }).catch(error => {
            res.status(500).json({
                status: false,
                message: 'server error, please contact administrator.',
                response: error
            });
        });
    });

app.post('/send-media', [
    body('token').notEmpty(),
    body('number').notEmpty(),
    body('caption').notEmpty(),
    body('media').notEmpty(),
    ], async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).json({
                status: false,
                message: 'error',
                response: errors.mapped(),
            });
        }

        const isValid = await validateApiToken(req.body.token);

        if (!isValid) {
            return res.status(403).json({
                status: false,
                message: 'The api token is invalid.'
            });
        }

        const number = phoneNumberFormatter(req.body.number);
        const caption = req.body.caption;
        const fileUrl = req.body.media;
        const fileUrlParsed = url.parse(fileUrl);

        let mimetype;
        const attachment = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
        }).then(response => {
            mimetype = response.headers['content-type'];
            return response.data.toString('base64');
        });

        const filename = path.basename(fileUrlParsed.pathname);

        const media = new MessageMedia(mimetype, attachment, filename);

        client.sendMessage(number, media, {
            caption: caption
        }).then(response => {
            res.status(200).json({
                status: true,
                message: 'success',
                response: response
            });
        }).catch(error => {
            res.status(500).json({
                status: false,
                message: 'server error, please contact administrator.',
                response: error
            });
        });
    });

server.listen(port, function () {
    console.log('App running on *: ' + port);
});
