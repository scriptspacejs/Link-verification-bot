require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const URL = require('url-parse');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Level system configuration
const LEVEL_UP_CHANNEL = '1417122639717339237';
const BASE_XP_PER_MESSAGE = 125; // Base XP for first message
const VOICE_XP_PER_MINUTE = 200; // XP per minute in voice
const BOT_OWNER_ID = '1327564898460242015'; // Bot owner ID

// XP calculation functions
function getXPForMessage(messageCount) {
    // Increase XP every 10 messages by 25 XP
    const bonusMultiplier = Math.floor(messageCount / 10);
    return BASE_XP_PER_MESSAGE + (bonusMultiplier * 25);
}

function getXPRequiredForLevel(level) {
    // Level 1 requires 0 XP, Level 2 requires 1000 XP, then increases exponentially
    if (level <= 1) return 0;
    return Math.floor(1000 * Math.pow(1.2, level - 2));
}

function getLevelFromXP(totalXP) {
    let level = 1;
    let requiredXP = 0;
    
    while (totalXP >= requiredXP) {
        level++;
        requiredXP = getXPRequiredForLevel(level);
    }
    
    return level - 1;
}

// Embed system storage
let embedData = {};

// Free emojis collection (no nitro needed)
const freeEmojis = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚',
    '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱',
    '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '🙁', '😖', '😞', '😟', '😤',
    '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠', '😡',
    '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈',
    '👿', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
    '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋',
    '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺',
    '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘',
    '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕',
    '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️',
    '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺',
    '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣',
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️',
    '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️',
    '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️',
    '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘',
    '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️',
    '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊',
    '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑',
    '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣',
    '🕤', '🕥', '🕦', '🕧'
];

// User data storage
let userData = {};
let voiceTracker = {};

// Load user data from file
const DATA_FILE = 'userdata.json';
if (fs.existsSync(DATA_FILE)) {
    try {
        userData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (error) {
        console.log('Creating new user data file...');
        userData = {};
    }
}

// Save user data to file
function saveUserData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));
}

// Cute small GIFs collection (open source/free to use) - EXPANDED!
const cuteGifs = [
    // Cats
    'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', // cute cat
    'https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif', // cute cat 2
    'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', // cute cat 3
    'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', // cute cat playing
    'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif', // cute kitten yawn
    'https://media.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif', // cute kitten
    'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif', // kitten playing
    'https://media.giphy.com/media/C9x8gX02SnMIoAClXa/giphy.gif', // sleepy cat
    'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', // orange cat
    'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif', // cat with heart eyes
    
    // Dogs
    'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', // cute dog
    'https://media.giphy.com/media/l2Sq29cFXoF80ADlK/giphy.gif', // cute puppy
    'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', // cute dog 2
    'https://media.giphy.com/media/k4ta29T68xlfi/giphy.gif', // cute dog wagging
    'https://media.giphy.com/media/ZCN6F3FAkwsyOGU2RS/giphy.gif', // cute puppy sleep
    'https://media.giphy.com/media/hFROvOhBPQVRm/giphy.gif', // golden retriever puppy
    'https://media.giphy.com/media/fxe8v45NNXFd4jdaNI/giphy.gif', // corgi
    'https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif', // happy dog
    'https://media.giphy.com/media/KZQlfylo73AMU/giphy.gif', // tiny puppy
    'https://media.giphy.com/media/KctrWMQ7u9D2du0YmD/giphy.gif', // sleepy dog
    
    // Other adorable animals
    'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', // cute baby
    'https://media.giphy.com/media/MDJ9UStOM0I0dJHGg/giphy.gif', // cute panda
    'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif', // cute bunny
    'https://media.giphy.com/media/UQDSBzfyiBKvgFcSTw/giphy.gif', // cute penguin
    'https://media.giphy.com/media/bAlYQOugzX9sY/giphy.gif', // cute hamster
    'https://media.giphy.com/media/W1xb8a6kazwBi/giphy.gif', // cute red panda
    'https://media.giphy.com/media/l3vRfhFD8hJCiP0uQ/giphy.gif', // cute baby animal
    'https://media.giphy.com/media/7T2R1eAIKnEJnAf5U8/giphy.gif', // cute fox
    'https://media.giphy.com/media/3o6ZtpRoYe9wbyfcBi/giphy.gif', // cute sloth
    'https://media.giphy.com/media/l2SpMlLvxRuG5RLoc/giphy.gif', // cute hedgehog
    'https://media.giphy.com/media/xT1R9B0yzVl0A2chE4/giphy.gif', // cute otter
    'https://media.giphy.com/media/3og0ILkn9dIGIp5VWo/giphy.gif', // cute seal
    
    // MORE CUTE ADDITIONS!
    'https://media.giphy.com/media/l41lGvinEgARjB2HC/giphy.gif', // baby elephant
    'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', // raccoon
    'https://media.giphy.com/media/26xBGcy977zkV5mes/giphy.gif', // baby goat
    'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', // baby duck
    'https://media.giphy.com/media/JTzPN5kkobFv7X0zPJ/giphy.gif', // koala
    'https://media.giphy.com/media/YyKPbc5OOTSQE/giphy.gif', // piglet
    'https://media.giphy.com/media/H4DjXQXamtTiIuCcRU/giphy.gif', // baby bear
    'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', // squirrel
    'https://media.giphy.com/media/zaPYyZvb0oMEvqDVTf/giphy.gif', // owlet
    'https://media.giphy.com/media/xjlC6nomocZhVXuZgM/giphy.gif', // alpaca
    'https://media.giphy.com/media/uA8WItRYSRkfm/giphy.gif', // baby monkey
    'https://media.giphy.com/media/lXu72d4iKwqek/giphy.gif', // dolphin
    'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', // turtle
    'https://media.giphy.com/media/3oEjHWPTo7c0ajPwty/giphy.gif', // guinea pig
    'https://media.giphy.com/media/Pkck2unt0XQfc4gs9R/giphy.gif', // ferret
    'https://media.giphy.com/media/lJNoBCvQYp7nq/giphy.gif', // chinchilla
    'https://media.giphy.com/media/A7Zc53i8U59SHv9CAm/giphy.gif', // baby hippo
    'https://media.giphy.com/media/H7iXrCBFfWQ0wOONEz/giphy.gif', // lamb
    'https://media.giphy.com/media/LSNqpYqGRqwrS/giphy.gif', // baby giraffe
    'https://media.giphy.com/media/FoKOvZSRwz4vC/giphy.gif', // baby chick
];

// Level up GIFs (extra cute for special moments)
const levelUpGifs = [
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM5ZjE4MzJkNzVkNGE4ZjA5NzBjOGVhNjJkZmE5NzJkMmVkZjA5NCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/kyLYXonQYYfwYDIeZl/giphy.gif', // celebration
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM5ZjE4MzJkNzVkNGE4ZjA5NzBjOGVhNjJkZmE5NzJkMmVkZjA5NCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/26BRCh4i2Yya9p9N6/giphy.gif', // party
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM5ZjE4MzJkNzVkNGE4ZjA5NzBjOGVhNjJkZmE5NzJkMmVkZjA5NCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/l0MYu38R0PPhIXh0Q/giphy.gif', // star
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGM5ZjE4MzJkNzVkNGE4ZjA5NzBjOGVhNjJkZmE5NzJkMmVkZjA5NCZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/26gsgWH4lnurglMWY/giphy.gif', // confetti
];

// Initialize user data
function initUser(userId) {
    if (!userData[userId]) {
        userData[userId] = {
            level: 1,
            totalXP: 0,
            messageCount: 0,
            voiceMinutes: 0,
            totalMessages: 0,
            totalVoiceMinutes: 0,
            lastMessageTime: 0,
            lastXPGain: 0
        };
    }
    return userData[userId];
}

// Get random cute GIF
function getRandomGif() {
    return cuteGifs[Math.floor(Math.random() * cuteGifs.length)];
}

// Get random level up GIF
function getRandomLevelUpGif() {
    return levelUpGifs[Math.floor(Math.random() * levelUpGifs.length)];
}

// Check if user should level up and handle level up
async function checkLevelUp(userId, guild, xpGained = 0) {
    const user = userData[userId];
    const oldLevel = user.level;
    const newLevel = getLevelFromXP(user.totalXP);

    console.log(`🔍 Level Check for ${guild.members.cache.get(userId)?.displayName || 'User'}: Old Level: ${oldLevel}, New Level: ${newLevel}, Total XP: ${user.totalXP}`);

    if (newLevel > oldLevel) {
        user.level = newLevel;
        saveUserData();

        console.log(`🎉 LEVEL UP! ${guild.members.cache.get(userId)?.displayName || 'User'} leveled up from ${oldLevel} to ${newLevel}!`);

        // Send cute level up notification
        const levelUpChannel = guild.channels.cache.get(LEVEL_UP_CHANNEL);
        if (levelUpChannel) {
            const member = guild.members.cache.get(userId);
            const nextLevelXP = getXPRequiredForLevel(newLevel + 1);
            const currentLevelXP = getXPRequiredForLevel(newLevel);
            const progressXP = user.totalXP - currentLevelXP;
            const neededXP = nextLevelXP - currentLevelXP;

            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🎉 LEVEL UP! 🎉')
                .setDescription(`🌟 **${member?.displayName || 'Someone'}** just reached **Level ${newLevel}**! 🌟`)
                .addFields(
                    { name: '⬆️ Previous Level', value: `${oldLevel}`, inline: true },
                    { name: '✨ New Level', value: `**${newLevel}**`, inline: true },
                    { name: '🎁 XP This Gain', value: `+${xpGained} XP`, inline: true },
                    { name: '⚡ Total XP', value: `${user.totalXP.toLocaleString()} XP`, inline: true },
                    { name: '💬 Total Messages', value: `${user.totalMessages}`, inline: true },
                    { name: '🎤 Voice Minutes', value: `${user.totalVoiceMinutes}`, inline: true },
                    { name: '📊 Progress to Next Level', value: `${progressXP}/${neededXP} XP (${Math.floor((progressXP/neededXP)*100)}%)`, inline: false }
                )
                .setColor(0xFFD700) // Gold color for level ups
                .setImage(getRandomLevelUpGif())
                .setThumbnail(member?.displayAvatarURL() || null)
                .setTimestamp()
                .setFooter({ text: `🎊 Congratulations! Keep chatting to gain more XP and level up again!` });

            try {
                const levelUpMsg = await levelUpChannel.send({ 
                    content: `🎉 <@${userId}> leveled up!`,
                    embeds: [levelUpEmbed] 
                });
                console.log(`✅ Level up notification sent successfully to channel ${LEVEL_UP_CHANNEL}`);
            } catch (error) {
                console.error(`❌ Failed to send level up message to channel ${LEVEL_UP_CHANNEL}:`, error);
                
                // Try to send in the current channel as backup
                try {
                    const currentChannel = guild.channels.cache.find(channel => 
                        channel.type === 0 && channel.permissionsFor(guild.members.me)?.has('SendMessages')
                    );
                    if (currentChannel) {
                        await currentChannel.send({ 
                            content: `🎉 <@${userId}> leveled up to **Level ${newLevel}**! (Backup notification - check level up channel permissions)`,
                            embeds: [levelUpEmbed] 
                        });
                        console.log(`✅ Backup level up notification sent to ${currentChannel.name}`);
                    }
                } catch (backupError) {
                    console.error('❌ Failed to send backup level up notification:', backupError);
                }
            }
        } else {
            console.error(`❌ Level up channel ${LEVEL_UP_CHANNEL} not found or inaccessible!`);
        }

        return true;
    }
    return false;
}

// Add XP for messages (with cooldown to prevent spam)
async function addMessageXP(userId, guild) {
    const user = initUser(userId);
    const now = Date.now();

    // 3 second cooldown between XP gains
    if (now - user.lastMessageTime < 3000) {
        return false;
    }

    user.lastMessageTime = now;
    user.messageCount++;
    user.totalMessages++;

    // Calculate XP based on message count (increases every 10 messages)
    const xpToGain = getXPForMessage(user.messageCount);
    user.totalXP += xpToGain;
    user.lastXPGain = xpToGain;

    console.log(`💰 ${guild.members.cache.get(userId)?.displayName || 'User'} gained ${xpToGain} XP (Total: ${user.totalXP} XP, Messages: ${user.messageCount})`);

    // Check for level up after gaining XP
    const leveledUp = await checkLevelUp(userId, guild, xpToGain);
    saveUserData();

    return leveledUp;
}

// Voice state tracking
client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const guild = newState.guild;

    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
        voiceTracker[userId] = Date.now();
    }

    // User left a voice channel
    if (oldState.channelId && !newState.channelId) {
        if (voiceTracker[userId]) {
            const timeSpent = Math.floor((Date.now() - voiceTracker[userId]) / 60000); // minutes
            delete voiceTracker[userId];

            if (timeSpent >= 1) { // At least 1 minute
                const user = initUser(userId);
                user.voiceMinutes += timeSpent;
                user.totalVoiceMinutes += timeSpent;

                // Add XP for voice time (200 XP per minute)
                const voiceXP = timeSpent * VOICE_XP_PER_MINUTE;
                user.totalXP += voiceXP;
                user.lastXPGain = voiceXP;

                console.log(`🎤 ${guild.members.cache.get(userId)?.displayName || 'User'} gained ${voiceXP} XP from ${timeSpent} minutes in voice (Total: ${user.totalXP} XP)`);

                await checkLevelUp(userId, guild, voiceXP);
                saveUserData();
            }
        }
    }

    // User switched channels (update tracker)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        if (voiceTracker[userId]) {
            const timeSpent = Math.floor((Date.now() - voiceTracker[userId]) / 60000);

            if (timeSpent >= 1) {
                const user = initUser(userId);
                user.voiceMinutes += timeSpent;
                user.totalVoiceMinutes += timeSpent;

                // Add XP for voice time (200 XP per minute)
                const voiceXP = timeSpent * VOICE_XP_PER_MINUTE;
                user.totalXP += voiceXP;
                user.lastXPGain = voiceXP;

                await checkLevelUp(userId, guild, voiceXP);
                saveUserData();
            }
        }
        voiceTracker[userId] = Date.now(); // Reset tracker for new channel
    }
});

// Malicious domains and patterns to check (keeping original security features)
const maliciousDomains = [
    // Discord phishing/scam domains
    'discord-nitro.com',
    'discordgift.site',
    'discord-give.com',
    'discord-app.net',
    'discordnitro.info',
    'discord-airdrop.org',
    'discordgiveaway.com',
    'disord.gg',
    'discordapp.io',
    'dlscord.gg',
    'discrod.gg',
    'discord-gifts.com',
    'free-discord-nitro.com',

    // Steam phishing domains
    'steam-nitro.com',
    'discordsteam.com',
    'steamcommunity.ru',
    'steamcommunlty.com',
    'steampowered.ru',
    'steamcommunitiy.com',
    'steam-wallet.com',

    // Known token grabber hosts
    'grabify.link',
    'iplogger.org',
    'iplogger.com',
    'iplogger.ru',
    'yip.su',
    'iplogger.co',
    'blasze.com',
    '2no.co',
    'ipgrabber.ru',
    'ipgraber.ru',

    // Other malicious domains
    'bit.do',
    'suspicious-site.tk',
    'malware-test.com',
    'phishing-test.com'
];

const suspiciousPatterns = [
    // Token grabber patterns
    /token[\s\-_]*grab/i,
    /grab[\s\-_]*token/i,
    /discord[\s\-_]*token/i,
    /steal[\s\-_]*token/i,
    /token[\s\-_]*steal/i,
    /account[\s\-_]*steal/i,
    /credential[\s\-_]*steal/i,

    // Common scam patterns
    /free\s*nitro/i,
    /free\s*discord/i,
    /steam\s*gift/i,
    /discord\s*gift/i,
    /nitro\s*generator/i,
    /discord\s*generator/i,
    /account\s*generator/i,

    // Phishing patterns
    /phishing/i,
    /scam/i,
    /fake[\s\-_]*login/i,
    /login[\s\-_]*steal/i,
    /password[\s\-_]*steal/i,

    // Malware patterns
    /malware/i,
    /trojan/i,
    /keylog/i,
    /backdoor/i,
    /rat[\s\-_]*tool/i,
    /remote[\s\-_]*access/i,

    // Suspicious file extensions in URLs
    /\.exe(\?|$|#)/i,
    /\.scr(\?|$|#)/i,
    /\.bat(\?|$|#)/i,
    /\.com(\?|$|#)/i,
    /\.pif(\?|$|#)/i,
    /\.vbs(\?|$|#)/i,

    // Webhook patterns
    /discord(?:app)?\.com\/api\/webhooks/i,
    /webhook/i
];

// URL pattern to detect links (improved to handle more edge cases)
const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;

// Function to check if URL is safe (keeping original functionality)
async function checkUrlSafety(url) {
    try {
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname.toLowerCase();
        const fullUrl = url.toLowerCase();
        const urlPath = parsedUrl.pathname.toLowerCase();

        // Priority Check 1: Discord webhook URLs (immediate threat)
        if (fullUrl.includes('discord.com/api/webhooks') || fullUrl.includes('discordapp.com/api/webhooks')) {
            return {
                safe: false,
                reason: '🚨 Discord webhook detected - HIGH RISK token grabber!',
                category: 'Token Grabber'
            };
        }

        // Priority Check 2: Known malicious domains
        for (const maliciousDomain of maliciousDomains) {
            if (domain.includes(maliciousDomain) || domain === maliciousDomain) {
                return {
                    safe: false,
                    reason: `🚨 Known malicious domain: ${maliciousDomain}`,
                    category: domain.includes('grab') || domain.includes('logger') ? 'Token Grabber' : 'Malicious Domain'
                };
            }
        }

        // Priority Check 3: Token grabber and malware patterns
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(fullUrl) || pattern.test(urlPath)) {
                const patternStr = pattern.toString();
                let category = 'Suspicious Content';

                if (patternStr.includes('token') || patternStr.includes('grab') || patternStr.includes('steal')) {
                    category = 'Token Grabber';
                } else if (patternStr.includes('malware') || patternStr.includes('trojan') || patternStr.includes('keylog')) {
                    category = 'Malware';
                } else if (patternStr.includes('phish') || patternStr.includes('scam')) {
                    category = 'Phishing/Scam';
                }

                return {
                    safe: false,
                    reason: `🚨 Dangerous pattern detected: ${category.toLowerCase()} indicators`,
                    category: category
                };
            }
        }

        // Check 4: Suspicious file extensions
        const dangerousExts = ['.exe', '.scr', '.bat', '.com', '.pif', '.vbs', '.jar', '.app', '.dmg'];
        if (dangerousExts.some(ext => urlPath.includes(ext))) {
            return {
                safe: false,
                reason: '⚠️ Potentially dangerous file extension detected',
                category: 'Malware Risk'
            };
        }

        // Check 5: URL shorteners (high risk for hiding malicious content)
        const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'short.link', 'cutt.ly', 'rb.gy', 'ow.ly', 'is.gd', 'buff.ly'];
        if (shorteners.some(shortener => domain.includes(shortener))) {
            return {
                safe: false,
                reason: '⚠️ URL shortener detected - cannot verify destination safety',
                category: 'URL Shortener Risk'
            };
        }

        // Check 6: Suspicious TLD patterns
        const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.000webhostapp.com'];
        if (suspiciousTlds.some(tld => domain.endsWith(tld))) {
            return {
                safe: false,
                reason: '⚠️ Suspicious domain extension - often used for malicious sites',
                category: 'Suspicious Domain'
            };
        }

        // Check 7: Try to analyze the actual website
        try {
            const response = await axios.head(url, { 
                timeout: 8000,
                maxRedirects: 3,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                validateStatus: function (status) {
                    return status < 500;
                }
            });

            // Check response headers for suspicious content
            const contentType = response.headers['content-type'] || '';
            const serverHeader = response.headers['server'] || '';

            // Suspicious content type checks
            if (contentType.includes('application/octet-stream') && !domain.includes('github.com')) {
                return {
                    safe: false,
                    reason: '⚠️ Suspicious file download detected',
                    category: 'Malware Risk'
                };
            }

            if (contentType.includes('application/javascript') && 
                !domain.includes('github.com') && 
                !domain.includes('jsdelivr.net') && 
                !domain.includes('cdnjs.com') &&
                !domain.includes('unpkg.com')) {
                return {
                    safe: false,
                    reason: '⚠️ Suspicious JavaScript content from untrusted source',
                    category: 'Suspicious Content'
                };
            }

        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
                return {
                    safe: false,
                    reason: '❌ Website unreachable or blocked - potentially malicious',
                    category: 'Inaccessible/Blocked'
                };
            }

            if (error.code === 'ETIMEDOUT') {
                return {
                    safe: false,
                    reason: '⚠️ Website timeout - potentially suspicious behavior',
                    category: 'Suspicious Behavior'
                };
            }
        }

        // If all security checks pass, mark as safe
        return {
            safe: true,
            reason: '✅ No malicious indicators found - appears safe',
            category: 'Verified Safe'
        };

    } catch (error) {
        return {
            safe: false,
            reason: '❌ Invalid or malformed URL',
            category: 'Invalid URL'
        };
    }
}

// Function to create safety embed (keeping original functionality)
function createSafetyEmbed(url, safetyResult) {
    const embed = new EmbedBuilder()
        .setTimestamp();

    // Only set URL if it's a valid, well-formed URL
    try {
        const testUrl = new URL(url);
        if (testUrl.protocol === 'http:' || testUrl.protocol === 'https:') {
            embed.setURL(url);
        }
    } catch (error) {
        // Don't set URL if it's malformed
        console.log(`Skipping malformed URL in embed: ${url}`);
    }

    if (safetyResult.safe) {
        embed
            .setTitle('✅ Link Safety Check - SAFE')
            .setColor(0x00FF00)
            .setDescription(`**Link:** \`${url}\`\n**Status:** This link appears to be safe to click.`)
            .addFields(
                { name: 'Security Status', value: safetyResult.category, inline: true },
                { name: 'Verification Result', value: safetyResult.reason, inline: true }
            );
    } else {
        let dangerLevel = '⚠️ CAUTION';
        let color = 0xFF6B00; // Orange for medium risk

        // Set danger level based on threat type
        if (safetyResult.category.includes('Token Grabber') || 
            safetyResult.category.includes('Malware') ||
            safetyResult.reason.includes('🚨')) {
            dangerLevel = '🚨 EXTREME DANGER';
            color = 0xFF0000; // Red for high risk
        } else if (safetyResult.category.includes('Phishing') || 
                   safetyResult.category.includes('Malicious')) {
            dangerLevel = '⚠️ HIGH RISK';
            color = 0xFF3300; // Dark red for high risk
        }

        embed
            .setTitle(`${dangerLevel} - DO NOT CLICK`)
            .setColor(color)
            .setDescription(`**🔗 Link:** \`${url}\`\n\n**🛑 SECURITY ALERT:** This link has been flagged as potentially dangerous!`)
            .addFields(
                { name: '🚨 Threat Type', value: safetyResult.category, inline: true },
                { name: '🔍 Detection Reason', value: safetyResult.reason, inline: true },
                { name: '⚠️ **IMPORTANT WARNING**', value: '**DO NOT CLICK THIS LINK!**\n\nThis link may:\n• Steal your Discord token\n• Install malware on your device\n• Phish your login credentials\n• Compromise your accounts', inline: false }
            )
            .setFooter({ text: '🔒 Stay safe! Report suspicious links to server administrators.' });
    }

    return embed;
}

client.on('ready', async () => {
    console.log(`✅ ${client.user.tag} is online and ready!`);
    console.log(`🔍 Monitoring ${client.guilds.cache.size} servers for link safety`);
    console.log(`🎁 Sending cute GIFs and tracking levels!`);

    // Set custom bot status (properly configured)
    try {
        await client.user.setPresence({
            activities: [{
                name: 'made with love by script 💖',
                type: 0 // 0 = PLAYING, 1 = STREAMING, 2 = LISTENING, 3 = WATCHING, 5 = COMPETING
            }],
            status: 'online' // 'online', 'idle', 'dnd', 'invisible'
        });
        console.log('✅ Bot status set successfully!');
    } catch (error) {
        console.error('❌ Error setting bot status:', error);
    }

    // Register slash commands
    const commands = [
        {
            name: 'embed',
            description: 'Create and send custom embeds',
            options: [
                {
                    name: 'message',
                    description: 'The message content for the embed',
                    type: 3, // STRING
                    required: true
                }
            ]
        }
    ];

    try {
        console.log('🔄 Registering slash commands...');
        
        // Register commands globally
        await client.application.commands.set(commands);
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
});

// Function to split long messages into chunks
function splitMessage(message, maxLength = 1900) {
    if (message.length <= maxLength) {
        return [message];
    }

    const chunks = [];
    let currentChunk = '';
    const words = message.split(' ');

    for (const word of words) {
        // If adding this word would exceed the limit
        if ((currentChunk + ' ' + word).length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = word;
            } else {
                // Word itself is too long, split it
                const longWord = word;
                for (let i = 0; i < longWord.length; i += maxLength) {
                    chunks.push(longWord.slice(i, i + maxLength));
                }
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + word;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// Function to create embed preview (handles long messages)
function createEmbedPreview(data, isMultiPart = false, partNumber = 1, totalParts = 1) {
    const fullMessage = data.message + (data.selectedEmojis.length > 0 ? '\n\n' + data.selectedEmojis.join(' ') : '');
    
    // For preview, show truncated version if too long
    let displayMessage = fullMessage;
    if (fullMessage.length > 1900 && !isMultiPart) {
        displayMessage = fullMessage.slice(0, 1897) + '...';
    }

    const embed = new EmbedBuilder()
        .setDescription(isMultiPart ? data.message : displayMessage)
        .setTimestamp();

    // Set embed style based on type
    let title = '📝 Message';
    switch (data.embedType) {
        case 'success':
            embed.setColor(0x00FF00);
            title = '✅ Success';
            break;
        case 'error':
            embed.setColor(0xFF0000);
            title = '❌ Error';
            break;
        case 'warning':
            embed.setColor(0xFFFF00);
            title = '⚠️ Warning';
            break;
        case 'info':
            embed.setColor(0x0099FF);
            title = 'ℹ️ Information';
            break;
        case 'cute':
            embed.setColor(0xFF69B4);
            title = '💖 Cute Message';
            break;
        case 'announcement':
            embed.setColor(0x9932CC);
            title = '📢 Announcement';
            break;
        default:
            embed.setColor(0x000000);
            title = '📝 Message';
    }

    // Add part indicator for multi-part messages
    if (totalParts > 1) {
        title += ` (${partNumber}/${totalParts})`;
    }
    embed.setTitle(title);

    // Only add image to first embed in multi-part messages
    if (data.image && partNumber === 1) {
        embed.setImage(data.image);
    }

    // Only add thumbnail to first embed in multi-part messages
    if (data.thumbnail && partNumber === 1) {
        embed.setThumbnail(data.thumbnail);
    }

    // Only add author to first embed in multi-part messages
    if (data.authorName && partNumber === 1) {
        if (data.authorIcon) {
            embed.setAuthor({ name: data.authorName, iconURL: data.authorIcon });
        } else {
            embed.setAuthor({ name: data.authorName });
        }
    }

    // Only add video to last embed in multi-part messages
    if (data.video && partNumber === totalParts) {
        const currentDesc = embed.data.description || '';
        embed.setDescription(currentDesc + `\n\n🎥 **Video:** ${data.video}`);
    }

    return embed;
}

// Function to create multiple embeds for long messages
function createMultipleEmbeds(data) {
    const fullMessage = data.message + (data.selectedEmojis.length > 0 ? '\n\n' + data.selectedEmojis.join(' ') : '');
    
    if (fullMessage.length <= 1900) {
        return [createEmbedPreview(data)];
    }

    const messageChunks = splitMessage(data.message, 1800); // Leave room for emojis
    const embeds = [];

    for (let i = 0; i < messageChunks.length; i++) {
        const tempData = { ...data };
        tempData.message = messageChunks[i];
        
        // Add emojis only to the last embed
        if (i === messageChunks.length - 1) {
            tempData.selectedEmojis = data.selectedEmojis;
        } else {
            tempData.selectedEmojis = [];
        }

        const embed = createEmbedPreview(tempData, true, i + 1, messageChunks.length);
        embeds.push(embed);
    }

    return embeds;
}

// Handle interactions (dropdowns, buttons, modals, slash commands)
client.on('interactionCreate', async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'embed') {
            // Only bot owner can use embed commands
            if (interaction.user.id !== BOT_OWNER_ID) {
                return interaction.reply({ content: `❌ <@${interaction.user.id}> can't use it only script can use it`, ephemeral: true });
            }

            const embedMessage = interaction.options.getString('message');

            // Store embed data for this interaction
            const embedId = `embed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            embedData[embedId] = {
                message: embedMessage,
                image: null,
                video: null,
                selectedEmojis: [],
                embedType: 'basic',
                targetChannel: interaction.channel.id, // Auto-set to current channel
                authorId: interaction.user.id,
                thumbnail: null,
                authorName: null,
                authorIcon: null
            };

            // Create the main embed options dropdown (AUTOMATICALLY FOCUSED)
            const mainOptionsRow = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`embed_main_options_${embedId}`)
                        .setPlaceholder('🎨✨ Select embed options to customize...')
                        .setMinValues(1)
                        .setMaxValues(8)
                        .addOptions([
                            {
                                label: '📝 Edit Message',
                                description: 'Change the embed message text',
                                value: 'edit_message',
                                emoji: '📝'
                            },
                            {
                                label: '🖼️ Add Image',
                                description: 'Add an image URL to the embed',
                                value: 'add_image',
                                emoji: '🖼️'
                            },
                            {
                                label: '🎥 Add Video',
                                description: 'Add a video URL to the embed',
                                value: 'add_video',
                                emoji: '🎥'
                            },
                            {
                                label: '😄 Free Emojis',
                                description: 'Add free emojis (no nitro needed)',
                                value: 'free_emojis',
                                emoji: '😄'
                            },
                            {
                                label: '🎨 Embed Style',
                                description: 'Choose embed color and style',
                                value: 'embed_type',
                                emoji: '🎨'
                            },
                            {
                                label: '📡 Select Channel',
                                description: 'Choose where to send the embed',
                                value: 'select_channel',
                                emoji: '📡'
                            },
                            {
                                label: '🖼️ Set Thumbnail',
                                description: 'Add a small thumbnail image',
                                value: 'set_thumbnail',
                                emoji: '🖼️'
                            },
                            {
                                label: '👤 Set Author',
                                description: 'Set embed author name and icon',
                                value: 'set_author',
                                emoji: '👤'
                            }
                        ])
                );

            // Action buttons row
            const actionsRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`preview_embed_${embedId}`)
                        .setLabel('👁️ Preview')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👁️'),
                    new ButtonBuilder()
                        .setCustomId(`send_embed_${embedId}`)
                        .setLabel('🚀 Send Now')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🚀'),
                    new ButtonBuilder()
                        .setCustomId(`cancel_embed_${embedId}`)
                        .setLabel('❌ Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            const previewEmbed = createEmbedPreview(embedData[embedId]);
            const currentChannel = interaction.guild.channels.cache.get(embedData[embedId].targetChannel);

            const messageLength = embedData[embedId].message.length;
            const willSplit = messageLength > 1900;
            const estimatedParts = willSplit ? Math.ceil(messageLength / 1800) : 1;

            await interaction.reply({
                content: `🎨✨ **Auto Embed Builder**\n📍 **Target Channel:** ${currentChannel}\n📝 **Message Length:** ${messageLength}/∞ characters${willSplit ? `\n📊 **Will Split Into:** ${estimatedParts} embeds` : ''}\n🎯 **Select options from dropdown below to customize:**`,
                embeds: [previewEmbed],
                components: [mainOptionsRow, actionsRow],
                ephemeral: true
            });

            return;
        }
    }

    if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

    // Only bot owner can use embed system
    if (!interaction.customId.includes('embed_') && !interaction.customId.includes('channel_select_')) return;
    
    const embedId = interaction.customId.split('_').slice(-1)[0];
    
    if (!embedData[embedId] || embedData[embedId].authorId !== interaction.user.id) {
        if (interaction.user.id !== BOT_OWNER_ID) {
            return interaction.reply({ content: `❌ <@${interaction.user.id}> can't use it only script can use it`, ephemeral: true });
        }
    }

    try {
        // Handle dropdown selections
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('embed_main_options_') || interaction.customId.startsWith('embed_options_')) {
                await interaction.deferUpdate();
                
                const selectedOptions = interaction.values;
                
                for (const option of selectedOptions) {
                    switch (option) {
                        case 'select_channel':
                            const channelSelectMenu = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`channel_select_${embedId}`)
                                        .setPlaceholder('📡 Choose target channel...')
                                        .addOptions(
                                            interaction.guild.channels.cache
                                                .filter(channel => channel.isTextBased() && !channel.isThread())
                                                .map(channel => ({
                                                    label: `#${channel.name}`,
                                                    description: `Send embed to ${channel.name}`,
                                                    value: channel.id,
                                                    emoji: '📢'
                                                }))
                                                .slice(0, 25) // Discord limit
                                        )
                                );

                            await interaction.followUp({
                                content: '📡 **Select Target Channel:**',
                                components: [channelSelectMenu],
                                ephemeral: true
                            });
                            continue;
                        case 'edit_message':
                            const messageModal = new ModalBuilder()
                                .setCustomId(`message_modal_${embedId}`)
                                .setTitle('📝 Edit Embed Message');

                            const messageInput = new TextInputBuilder()
                                .setCustomId('message_text')
                                .setLabel('Embed Message')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Enter your embed message here...')
                                .setValue(embedData[embedId].message)
                                .setRequired(true)
                                .setMaxLength(2000);

                            messageModal.addComponents(new ActionRowBuilder().addComponents(messageInput));
                            return interaction.followUp({ modal: messageModal });

                        case 'add_image':
                            const imageModal = new ModalBuilder()
                                .setCustomId(`image_modal_${embedId}`)
                                .setTitle('🖼️ Add Image URL');

                            const imageInput = new TextInputBuilder()
                                .setCustomId('image_url')
                                .setLabel('Image URL')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://example.com/image.png')
                                .setValue(embedData[embedId].image || '')
                                .setRequired(false);

                            imageModal.addComponents(new ActionRowBuilder().addComponents(imageInput));
                            return interaction.followUp({ modal: imageModal });

                        case 'add_video':
                            const videoModal = new ModalBuilder()
                                .setCustomId(`video_modal_${embedId}`)
                                .setTitle('🎥 Add Video URL');

                            const videoInput = new TextInputBuilder()
                                .setCustomId('video_url')
                                .setLabel('Video URL')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://youtube.com/watch?v=... or direct video URL')
                                .setValue(embedData[embedId].video || '')
                                .setRequired(false);

                            videoModal.addComponents(new ActionRowBuilder().addComponents(videoInput));
                            return interaction.followUp({ modal: videoModal });

                        case 'free_emojis':
                            const emojiSelectMenu = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`emoji_select_${embedId}`)
                                        .setPlaceholder('😄 Select free emojis...')
                                        .setMaxValues(10)
                                        .addOptions(
                                            freeEmojis.slice(0, 25).map((emoji, index) => ({
                                                label: `${emoji} Emoji ${index + 1}`,
                                                description: `Add ${emoji} to your embed`,
                                                value: emoji,
                                                emoji: emoji
                                            }))
                                        )
                                );

                            return interaction.followUp({
                                content: '😄 **Select Free Emojis** (no nitro needed):',
                                components: [emojiSelectMenu],
                                ephemeral: true
                            });

                        case 'embed_type':
                            const typeSelectMenu = new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`type_select_${embedId}`)
                                        .setPlaceholder('🎨 Choose embed style...')
                                        .addOptions([
                                            { label: '📝 Basic', description: 'Standard black embed', value: 'basic', emoji: '📝' },
                                            { label: '✅ Success', description: 'Green success embed', value: 'success', emoji: '✅' },
                                            { label: '❌ Error', description: 'Red error embed', value: 'error', emoji: '❌' },
                                            { label: '⚠️ Warning', description: 'Yellow warning embed', value: 'warning', emoji: '⚠️' },
                                            { label: 'ℹ️ Information', description: 'Blue info embed', value: 'info', emoji: 'ℹ️' },
                                            { label: '💖 Cute', description: 'Pink cute embed', value: 'cute', emoji: '💖' },
                                            { label: '📢 Announcement', description: 'Purple announcement embed', value: 'announcement', emoji: '📢' }
                                        ])
                                );

                            return interaction.followUp({
                                content: '🎨 **Choose Embed Style:**',
                                components: [typeSelectMenu],
                                ephemeral: true
                            });

                        case 'set_thumbnail':
                            const thumbnailModal = new ModalBuilder()
                                .setCustomId(`thumbnail_modal_${embedId}`)
                                .setTitle('🖼️ Set Embed Thumbnail');

                            const thumbnailInput = new TextInputBuilder()
                                .setCustomId('thumbnail_url')
                                .setLabel('Thumbnail URL')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://example.com/thumbnail.png')
                                .setValue(embedData[embedId].thumbnail || '')
                                .setRequired(false);

                            thumbnailModal.addComponents(new ActionRowBuilder().addComponents(thumbnailInput));
                            return interaction.followUp({ modal: thumbnailModal });

                        case 'set_author':
                            const authorModal = new ModalBuilder()
                                .setCustomId(`author_modal_${embedId}`)
                                .setTitle('👤 Set Embed Author');

                            const authorNameInput = new TextInputBuilder()
                                .setCustomId('author_name')
                                .setLabel('Author Name')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Enter author name...')
                                .setValue(embedData[embedId].authorName || '')
                                .setRequired(false);

                            const authorIconInput = new TextInputBuilder()
                                .setCustomId('author_icon')
                                .setLabel('Author Icon URL (optional)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('https://example.com/icon.png')
                                .setValue(embedData[embedId].authorIcon || '')
                                .setRequired(false);

                            authorModal.addComponents(
                                new ActionRowBuilder().addComponents(authorNameInput),
                                new ActionRowBuilder().addComponents(authorIconInput)
                            );
                            return interaction.followUp({ modal: authorModal });
                    }
                }
            }

            if (interaction.customId.startsWith('channel_select_')) {
                await interaction.deferUpdate();
                embedData[embedId].targetChannel = interaction.values[0];
                
                const channel = interaction.guild.channels.cache.get(interaction.values[0]);
                await interaction.followUp({
                    content: `📡 **Target Channel Set:** ${channel}`,
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('emoji_select_')) {
                await interaction.deferUpdate();
                embedData[embedId].selectedEmojis = interaction.values;
                
                await interaction.followUp({
                    content: `😄 **Emojis Added:** ${interaction.values.join(' ')}`,
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('type_select_')) {
                await interaction.deferUpdate();
                embedData[embedId].embedType = interaction.values[0];
                
                await interaction.followUp({
                    content: `🎨 **Embed Style Set:** ${interaction.values[0]}`,
                    ephemeral: true
                });
            }
        }

        // Handle button clicks
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('preview_embed_')) {
                const previewEmbeds = createMultipleEmbeds(embedData[embedId]);
                const messageLength = embedData[embedId].message.length;
                
                await interaction.reply({
                    content: `👁️ **Embed Preview** (${messageLength} characters, ${previewEmbeds.length} embed${previewEmbeds.length > 1 ? 's' : ''}):`,
                    embeds: previewEmbeds.slice(0, 10), // Discord limit of 10 embeds per message
                    ephemeral: true
                });

                // If more than 10 embeds, send additional messages
                if (previewEmbeds.length > 10) {
                    for (let i = 10; i < previewEmbeds.length; i += 10) {
                        const additionalEmbeds = previewEmbeds.slice(i, i + 10);
                        await interaction.followUp({
                            content: `📄 **Preview Continued** (Embeds ${i + 1}-${Math.min(i + 10, previewEmbeds.length)}):`,
                            embeds: additionalEmbeds,
                            ephemeral: true
                        });
                    }
                }
            }

            if (interaction.customId.startsWith('send_embed_')) {
                if (!embedData[embedId].targetChannel) {
                    return interaction.reply({
                        content: '❌ Please select a target channel first!',
                        ephemeral: true
                    });
                }

                const channel = interaction.guild.channels.cache.get(embedData[embedId].targetChannel);
                if (!channel) {
                    return interaction.reply({
                        content: '❌ Target channel not found!',
                        ephemeral: true
                    });
                }

                const finalEmbeds = createMultipleEmbeds(embedData[embedId]);
                const messageLength = embedData[embedId].message.length;
                
                try {
                    // Send embeds in batches (Discord limit: 10 embeds per message)
                    let sentMessages = 0;
                    for (let i = 0; i < finalEmbeds.length; i += 10) {
                        const embedBatch = finalEmbeds.slice(i, i + 10);
                        await channel.send({ embeds: embedBatch });
                        sentMessages++;
                        
                        // Small delay between messages to prevent rate limiting
                        if (i + 10 < finalEmbeds.length) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                    
                    await interaction.reply({
                        content: `🚀 **Embed sent successfully to ${channel}!**\n📊 **Details:** ${messageLength} characters, ${finalEmbeds.length} embed${finalEmbeds.length > 1 ? 's' : ''}, ${sentMessages} message${sentMessages > 1 ? 's' : ''}`,
                        ephemeral: true
                    });

                    // Clean up embed data
                    delete embedData[embedId];
                    
                    // Update original message to show completion
                    await interaction.message.edit({
                        content: '✅ **Embed sent successfully!**',
                        embeds: [],
                        components: []
                    });
                } catch (error) {
                    console.error('Error sending embed:', error);
                    await interaction.reply({
                        content: '❌ Failed to send embed. Check bot permissions!',
                        ephemeral: true
                    });
                }
            }

            if (interaction.customId.startsWith('cancel_embed_')) {
                delete embedData[embedId];
                
                await interaction.update({
                    content: '❌ **Embed creation cancelled.**',
                    embeds: [],
                    components: []
                });
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('message_modal_')) {
                const newMessage = interaction.fields.getTextInputValue('message_text');
                embedData[embedId].message = newMessage;
                
                const messageLength = newMessage.length;
                const willSplit = messageLength > 1900;
                const estimatedParts = willSplit ? Math.ceil(messageLength / 1800) : 1;
                
                const previewEmbeds = createMultipleEmbeds(embedData[embedId]);
                const displayEmbeds = previewEmbeds.slice(0, 3); // Show first 3 embeds in preview
                
                await interaction.reply({
                    content: `📝 **Message updated!**\n📊 **Length:** ${messageLength} characters${willSplit ? `\n📄 **Will create:** ${estimatedParts} embeds` : ''}\n👁️ **Preview:**${previewEmbeds.length > 3 ? ` (showing 1-3 of ${previewEmbeds.length})` : ''}`,
                    embeds: displayEmbeds,
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('image_modal_')) {
                const imageUrl = interaction.fields.getTextInputValue('image_url');
                embedData[embedId].image = imageUrl || null;
                
                await interaction.reply({
                    content: imageUrl ? `🖼️ **Image added:** ${imageUrl}` : '🖼️ **Image removed**',
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('video_modal_')) {
                const videoUrl = interaction.fields.getTextInputValue('video_url');
                embedData[embedId].video = videoUrl || null;
                
                await interaction.reply({
                    content: videoUrl ? `🎥 **Video added:** ${videoUrl}` : '🎥 **Video removed**',
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('thumbnail_modal_')) {
                const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail_url');
                embedData[embedId].thumbnail = thumbnailUrl || null;
                
                await interaction.reply({
                    content: thumbnailUrl ? `🖼️ **Thumbnail added:** ${thumbnailUrl}` : '🖼️ **Thumbnail removed**',
                    ephemeral: true
                });
            }

            if (interaction.customId.startsWith('author_modal_')) {
                const authorName = interaction.fields.getTextInputValue('author_name');
                const authorIcon = interaction.fields.getTextInputValue('author_icon');
                
                embedData[embedId].authorName = authorName || null;
                embedData[embedId].authorIcon = authorIcon || null;
                
                let responseMessage = '';
                if (authorName) {
                    responseMessage = `👤 **Author set:** ${authorName}`;
                    if (authorIcon) {
                        responseMessage += ` with icon: ${authorIcon}`;
                    }
                } else {
                    responseMessage = '👤 **Author removed**';
                }
                
                await interaction.reply({
                    content: responseMessage,
                    ephemeral: true
                });
            }
        }

    } catch (error) {
        console.error('Error handling embed interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Skip if not in a guild
    if (!message.guild) return;

    // Add XP for message (with cooldown to prevent spam)
    await addMessageXP(message.author.id, message.guild);

    // Send cute GIF for every message (100% chance - every conversation gets a cute GIF!)
    if (Math.random() < 1.0) {
        try {
            const cuteGif = getRandomGif();
            const gifEmbed = new EmbedBuilder()
                .setColor(0x000000) // Pure black for cute elegance
                .setImage(cuteGif)
                .setFooter({ text: '💖 Cute moment!', iconURL: message.author.displayAvatarURL() });

            await message.reply({ embeds: [gifEmbed] });
            console.log(`🎀 Sent cute GIF to ${message.author.tag}`);
        } catch (error) {
            console.error('Error sending cute GIF:', error);
        }
    }

    

    // Check for text commands (owner only)
    if (message.content.toLowerCase().startsWith('lvl ') || message.content.toLowerCase() === 'levels') {
        if (message.author.id !== BOT_OWNER_ID) {
            return; // Only bot owner can use these commands
        }

        if (message.content.toLowerCase() === 'levels') {
            // Show top 10 users by XP and level
            const sortedUsers = Object.entries(userData)
                .sort(([,a], [,b]) => b.totalXP - a.totalXP)
                .slice(0, 10);

            const leaderboard = sortedUsers.map(([userId, data], index) => {
                const member = message.guild.members.cache.get(userId);
                const name = member?.displayName || 'Unknown User';
                const nextLevelXP = getXPRequiredForLevel(data.level + 1);
                const currentLevelXP = getXPRequiredForLevel(data.level);
                const progress = data.totalXP - currentLevelXP;
                const needed = nextLevelXP - currentLevelXP;
                return `${index + 1}. **${name}** - Lv.${data.level} | ${data.totalXP.toLocaleString()} XP\n   └ Progress: ${progress}/${needed} XP to next level`;
            }).join('\n\n') || 'No users yet!';

            const embed = new EmbedBuilder()
                .setTitle('🏆 Server XP Leaderboard')
                .setDescription(leaderboard)
                .addFields(
                    { name: '💡 XP System', value: `**Messages:** Start at 125 XP, +25 XP every 10 messages\n**Voice:** 200 XP per minute`, inline: false }
                )
                .setColor(0x000000) // Pure black
                .setImage(getRandomGif())
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (message.content.toLowerCase().startsWith('lvl ')) {
            const parts = message.content.split(' ');
            
            // Check if it's a level set command (lvl @user number)
            if (parts.length === 3) {
                const mentionMatch = parts[1].match(/<@!?(\d+)>/);
                const levelNumber = parseInt(parts[2]);
                
                if (!mentionMatch || isNaN(levelNumber) || levelNumber < 1) {
                    return message.reply('❌ Invalid command! Use: `lvl @user <level>` or `lvl @user` to check level');
                }

                const targetUserId = mentionMatch[1];
                const targetMember = message.guild.members.cache.get(targetUserId);
                
                if (!targetMember) {
                    return message.reply('❌ User not found in this server!');
                }

                // Initialize or update user data
                const user = initUser(targetUserId);
                const oldLevel = user.level;
                const oldXP = user.totalXP;
                
                // Set XP to the minimum required for the target level
                const requiredXP = getXPRequiredForLevel(levelNumber);
                user.totalXP = requiredXP;
                user.level = levelNumber;
                
                saveUserData();

                const embed = new EmbedBuilder()
                    .setTitle('🔧 Level Cheat Applied!')
                    .setDescription(`🎯 **${targetMember.displayName}**'s level has been modified!`)
                    .addFields(
                        { name: '⬆️ Old Level', value: `${oldLevel}`, inline: true },
                        { name: '🌟 New Level', value: `${levelNumber}`, inline: true },
                        { name: '🔨 Applied by', value: `${message.author.displayName}`, inline: true },
                        { name: '💰 Old XP', value: `${oldXP.toLocaleString()} XP`, inline: true },
                        { name: '⚡ New XP', value: `${user.totalXP.toLocaleString()} XP`, inline: true },
                        { name: '📊 XP Difference', value: `+${(user.totalXP - oldXP).toLocaleString()} XP`, inline: true }
                    )
                    .setColor(0x000000) // Pure black
                    .setImage(getRandomLevelUpGif())
                    .setThumbnail(targetMember.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: '🎮 Owner cheat command used!' });

                return message.reply({ embeds: [embed] });
            }
            
            // Regular level check (lvl @user)
            else if (parts.length === 2) {
                const mentionMatch = parts[1].match(/<@!?(\d+)>/);
                if (!mentionMatch) {
                    return message.reply('Please mention a user! Example: `lvl @user` or `lvl @user 1000`');
                }

                const targetUserId = mentionMatch[1];
                const targetMember = message.guild.members.cache.get(targetUserId);
                const user = userData[targetUserId] || { level: 1, totalXP: 0, totalMessages: 0, totalVoiceMinutes: 0 };
                
                const nextLevelXP = getXPRequiredForLevel(user.level + 1);
                const currentLevelXP = getXPRequiredForLevel(user.level);
                const progress = user.totalXP - currentLevelXP;
                const needed = nextLevelXP - currentLevelXP;
                const progressPercent = Math.floor((progress / needed) * 100);

                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${targetMember?.displayName || 'Unknown User'}'s Stats`)
                    .addFields(
                        { name: '🌟 Level', value: `${user.level}`, inline: true },
                        { name: '⚡ Total XP', value: `${user.totalXP.toLocaleString()} XP`, inline: true },
                        { name: '📊 Progress', value: `${progressPercent}% (${progress}/${needed})`, inline: true },
                        { name: '💬 Total Messages', value: `${user.totalMessages}`, inline: true },
                        { name: '🎤 Voice Minutes', value: `${user.totalVoiceMinutes}`, inline: true },
                        { name: '🆙 Next Level XP', value: `${needed - progress} XP needed`, inline: true }
                    )
                    .setColor(0x000000) // Pure black
                    .setImage(getRandomGif())
                    .setTimestamp();

                if (targetMember) {
                    embed.setThumbnail(targetMember.displayAvatarURL());
                }

                return message.reply({ embeds: [embed] });
            }
            
            else {
                return message.reply('❌ Invalid command! Use:\n• `lvl @user` - Check user level\n• `lvl @user <number>` - Set user level (owner only)\n• `levels` - Show leaderboard');
            }
        }
    }

    // Extract URLs from the message for link verification
    const urls = message.content.match(urlPattern);

    if (urls && urls.length > 0) {
        console.log(`🔍 Found ${urls.length} URL(s) in message from ${message.author.tag}`);

        for (let url of urls) {
            try {
                // Clean up the URL (remove trailing punctuation)
                url = url.replace(/[.,;!?)\]}]+$/, '');

                // Validate URL format before processing
                try {
                    new URL(url);
                } catch (urlError) {
                    console.log(`Skipping invalid URL: ${url}`);
                    continue;
                }

                // Check URL safety
                const safetyResult = await checkUrlSafety(url);

                // Create and send safety embed
                const embed = createSafetyEmbed(url, safetyResult);

                // Send the safety report (permanent)
                const safetyMessage = await message.reply({ embeds: [embed] });

                // Log the result
                console.log(`🔍 URL Check: ${url} - ${safetyResult.safe ? 'SAFE' : 'UNSAFE'} (${safetyResult.category})`);

                // If unsafe, also send a warning in DM to the message author
                if (!safetyResult.safe) {
                    try {
                        await message.author.send({
                            content: `⚠️ **Warning!** You shared a potentially dangerous link in **${message.guild?.name || 'a server'}**`,
                            embeds: [embed]
                        });
                    } catch (dmError) {
                        console.log(`Could not send DM warning to ${message.author.tag}`);
                    }
                }

            } catch (error) {
                console.error(`Error checking URL ${url}:`, error);

                // Send error message
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Link Safety Check - Error')
                    .setColor(0xFF6B00)
                    .setDescription(`**Link:** ${url}\n**Status:** Could not verify link safety`)
                    .addFields({ name: 'Error', value: 'Unable to analyze this link. Please exercise caution.', inline: false })
                    .setTimestamp();

                const errorMessage = await message.reply({ embeds: [errorEmbed] });
            }
        }
    }
});

client.on('guildCreate', (guild) => {
    console.log(`✅ Joined new server: ${guild.name} (${guild.memberCount} members)`);
    console.log(`🔍 Now monitoring ${client.guilds.cache.size} servers total`);

    // Try to send a welcome message to the system channel
    if (guild.systemChannel) {
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎀 Cute Bot Activated!')
            .setColor(0x000000) // Pure black for elegant welcome message
            .setDescription('I will now automatically:\n🔍 Monitor all links for safety\n🎁 Send cute GIFs for every message\n📈 Track user XP and levels!')
            .addFields(
                { name: '✅ Safe Links', value: 'Will be marked as safe to click', inline: true },
                { name: '⚠️ Unsafe Links', value: 'Will be flagged with warnings', inline: true },
                { name: '🎀 Cute GIFs', value: 'Every message gets a cute GIF!', inline: true },
                { name: '🌟 XP System', value: 'Messages: 125+ XP (increases every 10 msgs)\nVoice: 200 XP per minute', inline: false }
            )
            .setImage(getRandomGif())
            .setFooter({ text: 'Your server is now protected and cuter!' })
            .setTimestamp();

        guild.systemChannel.send({ embeds: [welcomeEmbed] }).catch(console.error);
    }
});

client.on('guildDelete', (guild) => {
    console.log(`❌ Left server: ${guild.name}`);
    console.log(`🔍 Now monitoring ${client.guilds.cache.size} servers total`);
});

// Save user data periodically
setInterval(saveUserData, 300000); // Save every 5 minutes

// Error handling
client.on('error', console.error);

// Login with bot token
client.login(process.env.DISCORD_BOT_TOKEN);
