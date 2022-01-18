/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
/* eslint-disable consistent-return */
/* eslint-disable new-cap */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { execSync } = require('child_process');
const imageSearch = require('image-search-google');
const { EventEmitter } = require('events');

const emitter = new EventEmitter();

const { Client, MessageMedia } = require('whatsapp-web.js');
const wikiSearch = require('./scraper');

const SESSION_FILE_PATH = './session.json';

let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

const client = new Client({
  session: sessionData,
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('authenticated', (session) => {
  sessionData = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Client is ready!');
    }
  });
});

client.on('qr', (qr) => {
  // Generate and scan this code with your phone
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('Client is ready!');
});

client.on('message_create', async (msg) => {
  let isVip = false;
  let isOwner = false;
  let isAdmin = false;

  const mainChat = await msg.getChat();
  const { author } = msg;

  if (mainChat.isGroup) {
    mainChat.participants.forEach((participant) => {
      if (participant.id._serialized === author && participant.isAdmin) {
        isAdmin = true;
      }
    });
  }

  /*
    if(mainChat.!isGroup) return;
    mainChat.participants.forEach((participant) => {
      if (participant.id._serialized !== author && participant.!isAdmin) return;
        isAdmin = true;
  } */

  const contact = await msg.getContact();
  const rawdata = fs.readFileSync('banned.json');
  const bannedList = JSON.parse(rawdata);
  if (bannedList.banned.includes(contact.id._serialized)) return;

  const rawdatavip = fs.readFileSync('vips.json');
  const vipList = JSON.parse(rawdatavip);
  if (vipList.vips.includes(contact.id._serialized)) isVip = true;

  const rawdataowners = fs.readFileSync('owners.json');
  const ownersList = JSON.parse(rawdataowners);
  if (ownersList.owners.includes(contact.id._serialized)) {
    isVip = true;
    isOwner = true;
  }

  if (msg.body === '!ping') {
    msg.reply('pong');
  }

  if (msg.body === '.sticker') {
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        await msg.reply(media, null, { sendMediaAsSticker: true });
      } catch {
        msg.reply('Formato não suportado.');
      }
    } else if (msg.hasQuotedMsg) {
      const quotedMessage = await msg.getQuotedMessage();

      try {
        const media = await quotedMessage.downloadMedia();
        await msg.reply(media, null, { sendMediaAsSticker: true });
      } catch {
        msg.reply('Formato não suportado.');
      }
    } else {
      msg.reply(
        'Envie um gif ou uma foto, junto a mensagem ".sticker" para converte-lo.',
      );
    }
  }

  if (msg.body === '.toimg') {
    if (msg.hasQuotedMsg) {
      const quotedMessage = await msg.getQuotedMessage();

      try {
        const media = await quotedMessage.downloadMedia();
        await msg.reply(media);
      } catch {
        msg.reply('Imagem não suportada');
      }
    } else {
      msg.reply(
        'Envie um sticker, junto a mensagem ".sticker" para converte-lo.',
      );
    }
  }

  if (
    (msg.body.startsWith('.ban ') && isAdmin)
    || (msg.body.startsWith('.ban ') && isOwner)
  ) {
    const contacts = await msg.getMentions();
    const chat = await msg.getChat();

    if (chat.isGroup) {
      contacts.forEach((element) => {
        chat.removeParticipants([element.id._serialized]);
      });
    }

    try {
      const media = MessageMedia.fromFilePath('assets/hqdefault.jpg');
      msg.reply(media, null, { sendMediaAsSticker: true });
    } catch (err) {
      err;
    }
  }

  if (
    (msg.body.startsWith('.add ') && isAdmin)
    || (msg.body.startsWith('.add ') && isOwner)
  ) {
    const number = msg.body.split(' ');
    number.shift();

    const chat = await msg.getChat();

    const participants = [];

    if (chat.isGroup) {
      number.forEach(async (element) => {
        participants.push(`${element}@c.us`);
      });

      chat.addParticipants(participants);
    }
  }

  if (msg.body.startsWith('.botban ') && isOwner) {
    const mentions = await msg.getMentions();

    mentions.forEach((element) => {
      bannedList.banned.push(element.id._serialized);
    });

    const data = JSON.stringify(bannedList);
    fs.writeFileSync('banned.json', data);

    try {
      const media = MessageMedia.fromFilePath('assets/hqdefault.jpg');
      msg.reply(media, null, { sendMediaAsSticker: true });
    } catch (err) {
      err;
    }
  }

  if (msg.body.startsWith('.botunban ') && isOwner) {
    const mentions = await msg.getMentions();

    mentions.forEach((element) => {
      bannedList.banned = bannedList.banned.filter(
        (value) => value !== element.id._serialized,
      );
    });

    const data = JSON.stringify(bannedList);
    fs.writeFileSync('banned.json', data);

    try {
      const media = MessageMedia.fromFilePath('assets/desbanido.gif');
      msg.reply(media, null, { sendMediaAsSticker: true });
    } catch (err) {
      err;
    }
  }

  if (
    (msg.body === '.opengp' && isAdmin)
    || (msg.body === '.opengp' && isOwner)
  ) {
    const chat = await msg.getChat();
    if (chat.isGroup) await chat.setMessagesAdminsOnly(false);
  }

  if (
    (msg.body === '.closegp' && isAdmin)
    || (msg.body === '.closegp' && isOwner)
  ) {
    const chat = await msg.getChat();
    if (chat.isGroup) await chat.setMessagesAdminsOnly(true);
  }

  if (msg.body === '.broadcast' && isOwner) {
    const chats = await client.getChats();

    chats.forEach((element) => {
      client.sendMessage(element.id._serialized, msg.body.substring(10));
    });
  }

  if (msg.body === '.golpedeestado' && isOwner) {
    const chat = await msg.getChat();

    if (chat.isGroup) {
      const { participants } = chat;

      const serialized = [];

      participants.forEach((element) => {
        serialized.push(element.id._serialized);
      });

      await chat.removeParticipants(serialized);
    }
  }

  if (msg.body === '.picadura' && isOwner) {
    const chat = await msg.getChat();

    if (chat.isGroup) {
      const { participants } = chat;

      const serialized = [];

      participants.forEach((element) => {
        if (element.id._serialized !== client.info.wid) {
          serialized.push(element.id._serialized);
        }
      });

      await chat.demoteParticipants(serialized);
    }
  }

  let lastHash;

  if (msg.body.startsWith('.playmp3 ')) {
    const substring = msg.body.substring(9);

    const hash = Math.floor(Date.now() * Math.random()).toString(15);

    lastHash = hash;

    fs.writeFileSync(`${hash}.mp4`, '');
    await axios
      .get(
        `https://youtube.googleapis.com/youtube/v3/search?q=${substring}&key=AIzaSyC4P_VwphJWsFGb5nP2BREjzf2Xw4P9QCc`,
      )
      .then(async (res) => {
        const { videoId } = res.data.items[0].id;

        /* ytdl(`http://www.youtube.com/watch?v=${videoId}`).pipe(
          fs.createWriteStream(`${hash}.mp4`),
        ).on('finish', null, () => {
          downloaded = true;
        }); */

        emitter.on('converted', async () => {
          try {
            const media = MessageMedia.fromFilePath(`./${hash}.mp3`);
            await msg.reply(media);

            try {
              fs.unlink(`${lastHash}.mp4`, (err) => {
                if (err);
              });

              fs.unlink(`${lastHash}.mp3`, (err) => {
                if (err);
              });
            } catch (err) {
              return '';
            }
          } catch (err) {
            return '';
          }
        });

        const stream = ytdl(`http://www.youtube.com/watch?v=${videoId}`);
        stream.pipe(fs.createWriteStream(`${hash}.mp4`));
        stream.on('finish', () => {
          try {
            execSync(`ffmpeg -y -i ${hash}.mp4 ${hash}.mp3`, { stdio: 'inherit' }, async (error, stdout, stderr) => {
              console.log('entrou no ffmpeg');
              if (error) {
                console.log(`error: ${error.message}`);
              }
              if (stderr) {
                console.log(`stderr: ${stderr}`);
              }
              console.log(`stdout: ${stdout}`);
            });
          } catch (err) {
            return '';
          }

          emitter.emit('converted');
        });
      });
  }

  if (msg.body.startsWith('.wikipedia ')) {
    const substring = msg.body.substring(11);

    try {
      await msg.reply(await wikiSearch(`${substring}`));
    } catch (err) { msg.reply('Termo incorreto, tente outro.'); }
  }

  if (msg.body.startsWith('.addvip ') && isOwner) {
    const mentions = await msg.getMentions();

    mentions.forEach((element) => {
      vipList.vips.push(element.id._serialized);
    });

    const data = JSON.stringify(vipList);
    fs.writeFileSync('vips.json', data);
  }

  if (msg.body.startsWith('.addowner ') && isOwner) {
    const mentions = await msg.getMentions();

    mentions.forEach((element) => {
      ownersList.owners.push(element.id._serialized);
    });

    const data = JSON.stringify(ownersList);
    fs.writeFileSync('owners.json', data);
  }

  if (
    (msg.body === '.hidetag' && isAdmin)
    || (msg.body === '.hidetag' && isOwner)
  ) {
    const chat = await msg.getChat();

    if (chat.isGroup) {
      const { participants } = chat;
      const serialized = [];

      participants.forEach(async (element) => {
        await client.getContactById(element.id._serialized);
      });

      msg.reply('⠀', null, {
        mentions: serialized,
      });
    }
  }

  if (msg.body.startsWith('.img ')) {
    const substring = msg.body.substring(6);

    const client = new imageSearch(
      'c4726d8261979a149',
      'AIzaSyC4P_VwphJWsFGb5nP2BREjzf2Xw4P9QCc',
    );
    const options = { page: 1 };
    client
      .search(substring, options)
      .then(async (images) => {
        const imageurl = images[0].thumbnail;

        try {
          const media = await MessageMedia.fromUrl(imageurl);
          msg.reply(media);
        } catch (err) {
          err;
        }
      })
      .catch((error) => console.log(error));
  }

  if (msg.body === '.help') {
    msg.reply(
      '- .sticker: Envie uma midia ou marque, com o comando para transformar em sticker\n- .toimg: Marque um sticker, para transforma-lo em midia\n- .img: Pesquisa uma imagem no Google\n- .wikipedia: Pesquisa um termo na Wikipedia\n- .playmp3 nome_da_musica: Pesquisa uma musica no Youtube\n- .hidetag (Adm): Marca todos no grupo sem texto na mensagem\n- .ban (Adm): Bane um participante\n- .closegp (Adm): Muda as mensagens para somente adm.\n- .opengp (Adm): Reverte .closegp\n- .add (Adm): Adiciona alguém ao grupo\n- .addowner (Dono): Adiciona um dono ao bot\n- .addvip (Vip): Adiciona um vip ao bot\n- .botban (Dono): Bane do bot',
    );
  }

  if (msg.body.startsWith('.attp ') && isVip) {
    const getBuffer = async (url, options) => {
      try {
        options || {};
        const res = await axios({
          method: 'get',
          url,
          headers: {
            DNT: 1,
            'Upgrade-Insecure-Request': 1,
          },
          ...options,
          responseType: 'arraybuffer',
        });
        return res.data;
      } catch (e) {
        console.log(`Error : ${e}`);
      }
    };

    const substring = msg.body.substring(6); // TODO: pegar tudo dps do 7
    const url = encodeURI(`https://api.xteam.xyz/attp?file&text=${substring}`);

    const figuBuffer = await getBuffer(url);

    try {
      const media = new MessageMedia('image/gif', figuBuffer);
      msg.reply(media, null, { sendMediaAsSticker: true });
    } catch (err) {
      err;
    }
  }
});

client.initialize();
