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

// Embed system no longer needs complex storage

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

// Tiny cute GIFs collection - optimized for small, adorable content!
const cuteGifs = [
    // Tiny cute cats
    'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', // tiny kitten
    'https://media.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif', // sleepy kitten
    'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif', // kitten yawn
    'https://media.giphy.com/media/C9x8gX02SnMIoAClXa/giphy.gif', // tiny cat sleeping
    'https://media.giphy.com/media/11s7Ke7jcNxCHS/giphy.gif', // small kitten playing
    
    // Tiny cute dogs
    'https://media.giphy.com/media/KZQlfylo73AMU/giphy.gif', // tiny puppy
    'https://media.giphy.com/media/ZCN6F3FAkwsyOGU2RS/giphy.gif', // sleeping puppy
    'https://media.giphy.com/media/hFROvOhBPQVRm/giphy.gif', // tiny golden retriever
    'https://media.giphy.com/media/KctrWMQ7u9D2du0YmD/giphy.gif', // sleepy small dog
    
    // Super small animals
    'https://media.giphy.com/media/bAlYQOugzX9sY/giphy.gif', // tiny hamster
    'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif', // small bunny
    'https://media.giphy.com/media/UQDSBzfyiBKvgFcSTw/giphy.gif', // tiny penguin
    'https://media.giphy.com/media/l2SpMlLvxRuG5RLoc/giphy.gif', // tiny hedgehog
    'https://media.giphy.com/media/3oEjHWPTo7c0ajPwty/giphy.gif', // tiny guinea pig
    'https://media.giphy.com/media/lJNoBCvQYp7nq/giphy.gif', // tiny chinchilla
    'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', // small squirrel
    'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif', // tiny duck
    'https://media.giphy.com/media/FoKOvZSRwz4vC/giphy.gif', // baby chick
    'https://media.giphy.com/media/YyKPbc5OOTSQE/giphy.gif', // tiny piglet
    
    // Tiny baby animals
    'https://media.giphy.com/media/JTzPN5kkobFv7X0zPJ/giphy.gif', // tiny koala
    'https://media.giphy.com/media/zaPYyZvb0oMEvqDVTf/giphy.gif', // tiny owlet
    'https://media.giphy.com/media/H7iXrCBFfWQ0wOONEz/giphy.gif', // tiny lamb
    'https://media.giphy.com/media/26xBGcy977zkV5mes/giphy.gif', // tiny baby goat
    'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', // tiny turtle
    
    // Micro cute moments
    'https://media.giphy.com/media/MDJ9UStOM0I0dJHGg/giphy.gif', // tiny panda
    'https://media.giphy.com/media/W1xb8a6kazwBi/giphy.gif', // tiny red panda
    'https://media.giphy.com/media/7T2R1eAIKnEJnAf5U8/giphy.gif', // tiny fox
    'https://media.giphy.com/media/3o6ZtpRoYe9wbyfcBi/giphy.gif', // tiny sloth
    'https://media.giphy.com/media/Pkck2unt0XQfc4gs9R/giphy.gif', // tiny ferret
];

// Designated cute GIF channel
const CUTE_GIF_CHANNEL = '1377703145941106738';

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
                },
                {
                    name: 'channel',
                    description: 'Channel to send the embed to',
                    type: 7, // CHANNEL
                    required: false
                },
                {
                    name: 'style',
                    description: 'Embed style/color',
                    type: 3, // STRING
                    required: false,
                    choices: [
                        { name: '📝 Basic (Black)', value: 'basic' },
                        { name: '✅ Success (Green)', value: 'success' },
                        { name: '❌ Error (Red)', value: 'error' },
                        { name: '⚠️ Warning (Yellow)', value: 'warning' },
                        { name: 'ℹ️ Information (Blue)', value: 'info' },
                        { name: '💖 Cute (Pink)', value: 'cute' },
                        { name: '📢 Announcement (Purple)', value: 'announcement' }
                    ]
                },
                {
                    name: 'image',
                    description: 'Image URL for the embed',
                    type: 3, // STRING
                    required: false
                },
                {
                    name: 'thumbnail',
                    description: 'Thumbnail URL for the embed',
                    type: 3, // STRING
                    required: false
                },
                {
                    name: 'video',
                    description: 'Video URL for the embed',
                    type: 3, // STRING
                    required: false
                },
                {
                    name: 'author_name',
                    description: 'Author name for the embed',
                    type: 3, // STRING
                    required: false
                },
                {
                    name: 'author_icon',
                    description: 'Author icon URL for the embed',
                    type: 3, // STRING
                    required: false
                },
                {
                    name: 'emojis',
                    description: 'Add cute emojis to the embed',
                    type: 5, // BOOLEAN
                    required: false
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
    // Build the full message with emojis
    let displayMessage = data.message;
    
    // Add emojis to the last part only (or single part)
    if (data.selectedEmojis && data.selectedEmojis.length > 0 && partNumber === totalParts) {
        displayMessage += '\n\n' + data.selectedEmojis.join(' ');
    }
    
    // For preview, show truncated version if too long and not multi-part
    if (displayMessage.length > 1900 && !isMultiPart) {
        displayMessage = displayMessage.slice(0, 1897) + '...';
    }

    const embed = new EmbedBuilder()
        .setTimestamp();

    // Set embed style based on type
    let title = '📝 Message';
    let color = 0x000000;
    
    switch (data.embedType) {
        case 'success':
            color = 0x00FF00;
            title = '✅ Success';
            break;
        case 'error':
            color = 0xFF0000;
            title = '❌ Error';
            break;
        case 'warning':
            color = 0xFFFF00;
            title = '⚠️ Warning';
            break;
        case 'info':
            color = 0x0099FF;
            title = 'ℹ️ Information';
            break;
        case 'cute':
            color = 0xFF69B4;
            title = '💖 Cute Message';
            break;
        case 'announcement':
            color = 0x9932CC;
            title = '📢 Announcement';
            break;
        default:
            color = 0x000000;
            title = '📝 Message';
    }

    embed.setColor(color);

    // Add part indicator for multi-part messages
    if (totalParts > 1) {
        title += ` (${partNumber}/${totalParts})`;
    }
    embed.setTitle(title);

    // Set description
    if (displayMessage.trim()) {
        embed.setDescription(displayMessage);
    }

    // Only add image to first embed in multi-part messages
    if (data.image && partNumber === 1) {
        try {
            embed.setImage(data.image);
        } catch (error) {
            console.error('Error setting image:', error);
        }
    }

    // Only add thumbnail to first embed in multi-part messages  
    if (data.thumbnail && partNumber === 1) {
        try {
            embed.setThumbnail(data.thumbnail);
        } catch (error) {
            console.error('Error setting thumbnail:', error);
        }
    }

    // Only add author to first embed in multi-part messages
    if (data.authorName && partNumber === 1) {
        try {
            if (data.authorIcon) {
                embed.setAuthor({ name: data.authorName, iconURL: data.authorIcon });
            } else {
                embed.setAuthor({ name: data.authorName });
            }
        } catch (error) {
            console.error('Error setting author:', error);
            // Fallback: set without icon
            embed.setAuthor({ name: data.authorName });
        }
    }

    // Add video URL as a field to the last embed (Discord doesn't support video embeds directly)
    if (data.video && partNumber === totalParts) {
        embed.addFields({ 
            name: '🎥 Video', 
            value: `[Click to watch](${data.video})`, 
            inline: false 
        });
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

            await interaction.deferReply({ ephemeral: true });

            // Get all the options
            const embedMessage = interaction.options.getString('message');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const embedStyle = interaction.options.getString('style') || 'basic';
            const imageUrl = interaction.options.getString('image');
            const thumbnailUrl = interaction.options.getString('thumbnail');
            const videoUrl = interaction.options.getString('video');
            const authorName = interaction.options.getString('author_name');
            const authorIcon = interaction.options.getString('author_icon');
            const addEmojis = interaction.options.getBoolean('emojis') || false;

            // Validate channel permissions
            if (!targetChannel.isTextBased() || targetChannel.isThread()) {
                return interaction.editReply({
                    content: '❌ **Invalid channel!** Please select a text channel.'
                });
            }

            const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
            if (!botPermissions || !botPermissions.has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
                return interaction.editReply({
                    content: `❌ **Missing permissions!** I need "Send Messages" and "Embed Links" permissions in ${targetChannel}.`
                });
            }

            // Validate URLs if provided
            const urlValidation = (url, type) => {
                if (!url) return { valid: true };
                try {
                    new URL(url);
                    const isValidImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || 
                                       /^https:\/\/(i\.imgur\.com|cdn\.discordapp\.com|media\.giphy\.com|i\.gyazo\.com|prnt\.sc)/i.test(url);
                    
                    if ((type === 'image' || type === 'thumbnail' || type === 'author_icon') && !isValidImage) {
                        return { valid: false, message: `Invalid ${type} URL! Use a direct image link.` };
                    }
                    return { valid: true };
                } catch (error) {
                    return { valid: false, message: `Invalid ${type} URL format!` };
                }
            };

            // Validate all URLs
            const imageValidation = urlValidation(imageUrl, 'image');
            const thumbnailValidation = urlValidation(thumbnailUrl, 'thumbnail');
            const authorIconValidation = urlValidation(authorIcon, 'author_icon');
            const videoValidation = urlValidation(videoUrl, 'video');

            if (!imageValidation.valid) {
                return interaction.editReply({ content: `❌ ${imageValidation.message}` });
            }
            if (!thumbnailValidation.valid) {
                return interaction.editReply({ content: `❌ ${thumbnailValidation.message}` });
            }
            if (!authorIconValidation.valid) {
                return interaction.editReply({ content: `❌ ${authorIconValidation.message}` });
            }
            if (!videoValidation.valid) {
                return interaction.editReply({ content: `❌ ${videoValidation.message}` });
            }

            // Build embed data
            const embedData = {
                message: embedMessage,
                image: imageUrl,
                video: videoUrl,
                selectedEmojis: addEmojis ? freeEmojis.slice(0, 10) : [],
                embedType: embedStyle,
                targetChannel: targetChannel.id,
                authorId: interaction.user.id,
                thumbnail: thumbnailUrl,
                authorName: authorName,
                authorIcon: authorIcon
            };

            // Create embeds
            const finalEmbeds = createMultipleEmbeds(embedData);
            const messageLength = embedMessage.length;
            
            if (finalEmbeds.length === 0) {
                return interaction.editReply({
                    content: '❌ **Cannot create empty embed!** Please provide content.'
                });
            }
            
            try {
                let sentMessages = 0;
                let totalEmbedsSent = 0;
                
                // Send embeds in batches (Discord limit: 10 embeds per message)
                for (let i = 0; i < finalEmbeds.length; i += 10) {
                    const embedBatch = finalEmbeds.slice(i, i + 10);
                    
                    // Validate each embed in the batch
                    const validEmbeds = [];
                    for (const embed of embedBatch) {
                        try {
                            // Test if embed is valid by converting to JSON
                            JSON.stringify(embed.toJSON());
                            validEmbeds.push(embed);
                        } catch (embedError) {
                            console.error('Invalid embed detected:', embedError);
                        }
                    }
                    
                    if (validEmbeds.length > 0) {
                        const sentMessage = await targetChannel.send({ embeds: validEmbeds });
                        sentMessages++;
                        totalEmbedsSent += validEmbeds.length;
                        
                        // Small delay between messages to prevent rate limiting
                        if (i + 10 < finalEmbeds.length) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
                
                if (sentMessages > 0) {
                    // Create summary embed
                    const summaryEmbed = new EmbedBuilder()
                        .setTitle('🚀 Embed Sent Successfully!')
                        .setDescription(`Your embed has been sent to ${targetChannel}`)
                        .addFields(
                            { name: '📍 Channel', value: `${targetChannel}`, inline: true },
                            { name: '📊 Message Length', value: `${messageLength} characters`, inline: true },
                            { name: '📄 Embeds Created', value: `${totalEmbedsSent}`, inline: true },
                            { name: '💌 Messages Sent', value: `${sentMessages}`, inline: true },
                            { name: '🎨 Style', value: `${embedStyle}`, inline: true },
                            { name: '✅ Status', value: 'Complete', inline: true }
                        )
                        .setColor(0x00FF00)
                        .setTimestamp()
                        .setFooter({ text: '✨ Created with slash commands!' });

                    // Add feature summary
                    let features = [];
                    if (imageUrl) features.push('🖼️ Image');
                    if (thumbnailUrl) features.push('🖼️ Thumbnail');
                    if (videoUrl) features.push('🎥 Video');
                    if (authorName) features.push('👤 Author');
                    if (addEmojis) features.push('😄 Emojis');
                    
                    if (features.length > 0) {
                        summaryEmbed.addFields({ name: '✨ Features Used', value: features.join(', '), inline: false });
                    }

                    await interaction.editReply({ embeds: [summaryEmbed] });
                } else {
                    await interaction.editReply({
                        content: '❌ **Failed to send embed!** All embeds were invalid or corrupted.'
                    });
                }
                
            } catch (error) {
                console.error('Error sending embed:', error);
                let errorMessage = '❌ **Failed to send embed!**\n';
                
                if (error.code === 50013) {
                    errorMessage += '**Reason:** Missing permissions in target channel';
                } else if (error.code === 50035) {
                    errorMessage += '**Reason:** Invalid embed content (too long or malformed)';
                } else if (error.code === 50001) {
                    errorMessage += '**Reason:** Missing access to target channel';
                } else {
                    errorMessage += `**Reason:** ${error.message || 'Unknown error'}`;
                }
                
                await interaction.editReply({ content: errorMessage });
            }

            return;
        }
    }

    // No more complex dropdown/modal interactions needed
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Skip if not in a guild
    if (!message.guild) return;

    // Gaming message detection patterns
    const gamingPatterns = [
        // Direct gaming terms
        /@everyone\s+4v4/i,
        /custom\s+match\s+4v4/i,
        /scrims?\s*(&|and)\s*tournaments?/i,
        /instagram\s+account\s+promotion/i,
        
        // General gaming patterns
        /4v4/i,
        /5v5/i,
        /1v1/i,
        /custom\s+match/i,
        /scrim(s|mage)?/i,
        /tournament/i,
        /gaming\s+server/i,
        /game\s+lobby/i,
        /join\s+match/i,
        /looking\s+for\s+players?/i,
        /lfp/i,
        /ranked\s+match/i,
        /competitive\s+match/i,
        
        // Promotion patterns
        /follow\s+my\s+instagram/i,
        /check\s+out\s+my\s+instagram/i,
        /promote\s+my/i,
        /sub\s+to\s+my\s+channel/i,
        /check\s+my\s+profile/i,
        /follow\s+me\s+on/i,
        /self\s+promo/i,
        /promoting\s+my/i,
        
        // Unrelated to development patterns
        /anyone\s+want\s+to\s+play/i,
        /who\s+wants\s+to\s+game/i,
        /gaming\s+session/i,
        /clan\s+recruitment/i,
        /team\s+recruitment/i,
        /esports\s+team/i
    ];

    // Check if message contains gaming/promotion content
    const messageContent = message.content.toLowerCase();
    const isGamingMessage = gamingPatterns.some(pattern => pattern.test(message.content));
    
    // Additional context checks for broader detection
    const containsAtEveryone = message.content.includes('@everyone') || message.content.includes('@here');
    const hasGamingContext = /\b(game|gaming|play|match|scrim|tournament|clan|team|competitive|ranked)\b/i.test(messageContent);
    const hasPromotionContext = /\b(follow|subscribe|check|promote|promo|instagram|youtube|tiktok|channel)\b/i.test(messageContent);
    
    if (isGamingMessage || (containsAtEveryone && hasGamingContext) || hasPromotionContext) {
        try {
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Server Guidelines Reminder')
                .setDescription('**scriptspace.gg/scriptspace.in** is not a gaming server - it\'s based on development, coding, programming and deployments.\n\n❌ Please don\'t send messages regarding gaming and self promotions.')
                .addFields(
                    { name: '✅ What belongs here:', value: '• Coding discussions\n• Programming help\n• Development projects\n• Deployment questions\n• Tech tutorials', inline: true },
                    { name: '❌ What doesn\'t belong:', value: '• Gaming content\n• Match organizing\n• Self promotions\n• Social media ads\n• Unrelated content', inline: true }
                )
                .setColor(0xFF6B00) // Orange warning color
                .setImage(getRandomGif())
                .setFooter({ text: 'Keep the server focused on development! 💻' })
                .setTimestamp();

            await message.reply({ embeds: [warningEmbed] });
            console.log(`⚠️ Gaming/promotion message detected from ${message.author.tag}: "${message.content.slice(0, 100)}..."`);
        } catch (error) {
            console.error('Error sending gaming filter warning:', error);
        }
    }

    // Add XP for message (with cooldown to prevent spam)
    await addMessageXP(message.author.id, message.guild);

    // Send tiny cute GIF only in the designated channel
    if (message.channel.id === CUTE_GIF_CHANNEL && Math.random() < 1.0) {
        try {
            const cuteGif = getRandomGif();
            const gifEmbed = new EmbedBuilder()
                .setColor(0x000000) // Pure black for cute elegance
                .setImage(cuteGif)
                .setFooter({ text: '💖 Tiny cute moment!', iconURL: message.author.displayAvatarURL() });

            await message.reply({ embeds: [gifEmbed] });
            console.log(`🎀 Sent tiny cute GIF to ${message.author.tag} in designated channel`);
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