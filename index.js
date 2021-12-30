const fs = require('fs');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { execSync } = require("child_process");
const wikiSearch = require('./scraper');
const imageSearch = require('image-search-google');


const { Client, MessageMedia } = require('whatsapp-web.js');
const { runInContext } = require('vm');

const client = new Client();

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');

});

client.on('message', async msg => {
    let isVip = false;
    let isOwner = true;

    let contact = await msg.getContact();
    let rawdata = fs.readFileSync('banned.json');
    let bannedList = JSON.parse(rawdata);
    if(bannedList.banned.includes(contact.id._serialized)) return console.log('banido!');

    let rawdatavip = fs.readFileSync('vips.json');
    let vipList = JSON.parse(rawdatavip);
    if(vipList.vips.includes(contact.id._serialized)) isVip = true;

    let rawdataowners = fs.readFileSync('owners.json');
    let ownersList = JSON.parse(rawdataowners);
    if(ownersList.owners.includes(contact.id._serialized)) { isVip = true, isOwner = true };

    if (msg.body == '!ping') {
        msg.reply('pong');
    }

    if(msg.body == '.sticker') {

        if(msg.hasMedia){
            let media = await msg.downloadMedia();
            await msg.reply(media, null, { sendMediaAsSticker: true });
        }
        else if(msg.hasQuotedMsg){
            let quotedMessage = await msg.getQuotedMessage();
            let media = await quotedMessage.downloadMedia();
            await msg.reply(media, null, { sendMediaAsSticker: true });
        }
        else{
            msg.reply('Envie um gif ou uma foto, junto a mensagem ".sticker" para converte-lo.');
        }
        
    }

    if(msg.body == '.toimg') {

        if(msg.hasQuotedMsg){
            let quotedMessage = await msg.getQuotedMessage();
            let media = await quotedMessage.downloadMedia();
            await msg.reply(media);
        }
        else{
            msg.reply('Envie um sticker, junto a mensagem ".sticker" para converte-lo.');

        }

    }

    if(msg.body.startsWith('.ban ') && isVip || isOwner){
        let contacts = await msg.getMentions();
        let chat = await msg.getChat();

        if(chat.isGroup){
            contacts.forEach(element => {
                chat.removeParticipants([element.id._serialized]);
            })
        }

    }

    if(msg.body.startsWith('.add ') && isVip || isOwner){

        let number = msg.body.split(' ');     
        number.shift();

        let chat = await msg.getChat();

        let participants = [];

        if(chat.isGroup){
            number.forEach(async element => {
                participants.push(`${element}@c.us`)
            })

            chat.addParticipants(participants);
        }
    }


    if(msg.body.startsWith('.botban ') && isOwner){
        let mentions = await msg.getMentions();

        mentions.forEach(element => {
            bannedList.banned.push(element.id._serialized);
        });

        let data = JSON.stringify(bannedList);
        fs.writeFileSync('banned.json', data);
    }

    if(msg.body == '.opengp' && isVip || isOwner){
        let chat = await msg.getChat();
        if(chat.isGroup) await chat.setMessagesAdminsOnly(false);
    }

    
    if(msg.body == '.closegp' && isVip || isOwner){
        let chat = await msg.getChat();
        if(chat.isGroup) await chat.setMessagesAdminsOnly(true);
    }

    if(msg.body == '.broadcast' && isOwner){
        let chats = await client.getChats();

        chats.forEach(element => {
            client.sendMessage(element.id._serialized, msg.body.substring(10));
        })
    }

    if(msg.body == '.golpedeestado' && isOwner){
        let chat = await msg.getChat();

        if(chat.isGroup){
            let participants = chat.participants

            let serialized = [];

            participants.forEach(element => {
                serialized.push(element.id._serialized);
            })

            await chat.removeParticipants(serialized);
        }

    }

    if(msg.body == '.picadura' && isOwner){
        let chat = await msg.getChat();

        if(chat.isGroup){
            let participants = chat.participants

            let serialized = [];

            participants.forEach(element => {
                if(element.id._serialized != Client.info.wid){
                    serialized.push(element.id._serialized);
                }
            })

            await chat.demoteParticipants(serialized);
        }

    }

    if(msg.body.startsWith('.playmp3 ')){
        let substring = msg.body.substring(9)

        try{
            fs.unlink('audio.mp4', (err) => {
                if(err);
            });
            
            fs.unlink('audio.mp3', (err) => {
                if(err);
            });
            }catch{
        
            }
        
            await axios.get(`https://youtube.googleapis.com/youtube/v3/search?q=${substring}&key=AIzaSyC4P_VwphJWsFGb5nP2BREjzf2Xw4P9QCc`)
            .then(async res => {
                let videoId = res.data.items[0].id.videoId
        
                ytdl(`http://www.youtube.com/watch?v=${videoId}`)
                .pipe(fs.createWriteStream('video.mp4'));
        
            }).then(() => {
                execSync("ffmpeg -i video.mp4 audio.mp3", (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                        return;
                    }
                    console.log(`stdout: ${stdout}`);
                });
            }).then(async () => {

                try{
                    let media = MessageMedia.fromFilePath('./audio.mp3');
                    await msg.reply(media);
                }catch{
                    
                }

            })

    }

    if(msg.body.startsWith('.wikipedia ')){
        let substring = msg.body.substring(11)

        await msg.reply(await wikiSearch(`${substring}`));
    }

    if(msg.body.startsWith('.addvip ') && isOwner){
        let mentions = await msg.getMentions();

        mentions.forEach(element => {
            vipList.vips.push(element.id._serialized);
        });

        let data = JSON.stringify(vipList);
        fs.writeFileSync('vips.json', data);
        
    }

    if(msg.body.startsWith('.addowner ') && isOwner){
        let mentions = await msg.getMentions();

        mentions.forEach(element => {
            ownersList.owners.push(element.id._serialized);
        });

        let data = JSON.stringify(ownersList);
        fs.writeFileSync('owners.json', data);
        
    }

    if(msg.body == '.hidetag' && isVip || isOwner) {
        let chat = await msg.getChat();

        if(chat.isGroup){
            let participants = chat.participants;
            let serialized = [];

            participants.forEach(async element => {
                await Client.getContactById(element.id._serialized);
            })

            msg.reply('⠀', null, {
                mentions: serialized
            })
        }
    }

    if(msg.body.startsWith('.img ')){
        let substring = msg.body.substring(6);

        const client = new imageSearch('c4726d8261979a149', 'AIzaSyC4P_VwphJWsFGb5nP2BREjzf2Xw4P9QCc');
        const options = {page:1};
        client.search(substring, options)
            .then(async images => {
                let imageurl = images[0].thumbnail;

                let media = await MessageMedia.fromUrl(imageurl);
                msg.reply(media);
            })
            .catch(error => console.log(error));
    }

    if(msg.body == 'help'){
        msg.reply("- .sticker: Envie uma midia ou marque, com o comando para transformar em sticker\n- .toimg: Marque um sticker, para transforma-lo em midia\n- .img: Pesquisa uma imagem no Google\n- .wikipedia: Pesquisa um termo na Wikipedia\n- .playmp3 nome_da_musica: Pesquisa uma musica no Youtube\n- .hidetag (Adm): Marca todos no grupo sem texto na mensagem\n- .ban (Adm): Bane um participante\n- .closegp (Adm): Muda as mensagens para somente adm.\n- .opengp (Adm): Reverte .closegp\n- .add (Adm): Adiciona alguém ao grupo\n- .addowner (Dono): Adiciona um dono ao bot\n- .addvip (Vip): Adiciona um vip ao bot\n- .botban (Dono): Bane do bot")
    }

});

client.initialize();