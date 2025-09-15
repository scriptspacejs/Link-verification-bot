
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
const MESSAGES_PER_LEVEL = 50;
const VOICE_MINUTES_PER_LEVEL = 30;
const BOT_OWNER_ID = process.env.BOT_OWNER_ID; // Add this to your .env file

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

// Cute small GIFs collection (open source/free to use)
const cuteGifs = [
    'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', // cute cat
    'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', // cute dog
    'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', // cute baby
    'https://media.giphy.com/media/MDJ9UStOM0I0dJHGg/giphy.gif', // cute panda
    'https://media.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif', // cute kitten
    'https://media.giphy.com/media/l2Sq29cFXoF80ADlK/giphy.gif', // cute puppy
    'https://media.giphy.com/media/yFQ0ywscgobJK/giphy.gif', // cute bunny
    'https://media.giphy.com/media/UQDSBzfyiBKvgFcSTw/giphy.gif', // cute penguin
    'https://media.giphy.com/media/8vQSQ3cNXuDGo/giphy.gif', // cute cat 2
    'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif', // cute cat 3
    'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', // cute dog 2
    'https://media.giphy.com/media/bAlYQOugzX9sY/giphy.gif', // cute hamster
    'https://media.giphy.com/media/W1xb8a6kazwBi/giphy.gif', // cute red panda
    'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', // cute cat playing
    'https://media.giphy.com/media/k4ta29T68xlfi/giphy.gif', // cute dog wagging
    'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif', // cute kitten yawn
    'https://media.giphy.com/media/ZCN6F3FAkwsyOGU2RS/giphy.gif', // cute puppy sleep
    'https://media.giphy.com/media/l3vRfhFD8hJCiP0uQ/giphy.gif', // cute baby animal
    'https://media.giphy.com/media/7T2R1eAIKnEJnAf5U8/giphy.gif', // cute fox
    'https://media.giphy.com/media/3o6ZtpRoYe9wbyfcBi/giphy.gif', // cute sloth
    'https://media.giphy.com/media/l2SpMlLvxRuG5RLoc/giphy.gif', // cute hedgehog
    'https://media.giphy.com/media/xT1R9B0yzVl0A2chE4/giphy.gif', // cute otter
    'https://media.giphy.com/media/3og0ILkn9dIGIp5VWo/giphy.gif', // cute seal
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
            messageCount: 0,
            voiceMinutes: 0,
            totalMessages: 0,
            totalVoiceMinutes: 0,
            lastMessageTime: 0
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
async function checkLevelUp(userId, guild) {
    const user = userData[userId];
    const currentLevel = user.level;
    
    // Calculate new level based on messages and voice time
    const messageBasedLevel = Math.floor(user.totalMessages / MESSAGES_PER_LEVEL) + 1;
    const voiceBasedLevel = Math.floor(user.totalVoiceMinutes / VOICE_MINUTES_PER_LEVEL) + 1;
    const newLevel = Math.max(messageBasedLevel, voiceBasedLevel);
    
    if (newLevel > currentLevel) {
        user.level = newLevel;
        saveUserData();
        
        // Send cute level up notification
        const levelUpChannel = guild.channels.cache.get(LEVEL_UP_CHANNEL);
        if (levelUpChannel) {
            const member = guild.members.cache.get(userId);
            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🎉 Level Up! 🎉')
                .setDescription(`🌟 **${member?.displayName || 'Someone'}** just leveled up! 🌟`)
                .addFields(
                    { name: '✨ New Level', value: `**${newLevel}**`, inline: true },
                    { name: '💬 Total Messages', value: `${user.totalMessages}`, inline: true },
                    { name: '🎤 Voice Minutes', value: `${user.totalVoiceMinutes}`, inline: true }
                )
                .setColor(0xFF69B4)
                .setImage(getRandomLevelUpGif())
                .setTimestamp()
                .setFooter({ text: '🎊 Keep chatting to level up more!' });
            
            try {
                await levelUpChannel.send({ embeds: [levelUpEmbed] });
            } catch (error) {
                console.error('Could not send level up message:', error);
            }
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
    
    const leveledUp = await checkLevelUp(userId, guild);
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
                
                await checkLevelUp(userId, guild);
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
                await checkLevelUp(userId, guild);
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

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} is online and ready!`);
    console.log(`🔍 Monitoring ${client.guilds.cache.size} servers for link safety`);
    console.log(`🎁 Sending cute GIFs and tracking levels!`);
    
    // Set bot status
    client.user.setActivity('🎀 Sending cute GIFs & protecting links!', { type: 'WATCHING' });
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
                .setColor(0xFFB6C1)
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
            // Show top 10 users by level
            const sortedUsers = Object.entries(userData)
                .sort(([,a], [,b]) => b.level - a.level)
                .slice(0, 10);
            
            const leaderboard = sortedUsers.map(([userId, data], index) => {
                const member = message.guild.members.cache.get(userId);
                const name = member?.displayName || 'Unknown User';
                return `${index + 1}. **${name}** - Level ${data.level} (${data.totalMessages} msgs, ${data.totalVoiceMinutes}min voice)`;
            }).join('\n') || 'No users yet!';
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 Server Leaderboard')
                .setDescription(leaderboard)
                .setColor(0xFFD700)
                .setImage(getRandomGif())
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }
        
        if (message.content.toLowerCase().startsWith('lvl ')) {
            // Show specific user level
            const mentionMatch = message.content.match(/<@!?(\d+)>/);
            if (!mentionMatch) {
                return message.reply('Please mention a user! Example: `lvl @user`');
            }
            
            const targetUserId = mentionMatch[1];
            const targetMember = message.guild.members.cache.get(targetUserId);
            const user = userData[targetUserId] || { level: 1, totalMessages: 0, totalVoiceMinutes: 0 };
            
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${targetMember?.displayName || 'Unknown User'}'s Stats`)
                .addFields(
                    { name: '🌟 Level', value: `${user.level}`, inline: true },
                    { name: '💬 Total Messages', value: `${user.totalMessages}`, inline: true },
                    { name: '🎤 Voice Minutes', value: `${user.totalVoiceMinutes}`, inline: true }
                )
                .setColor(0x9370DB)
                .setImage(getRandomGif())
                .setTimestamp();
            
            if (targetMember) {
                embed.setThumbnail(targetMember.displayAvatarURL());
            }
            
            return message.reply({ embeds: [embed] });
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
            .setColor(0xFF69B4)
            .setDescription('I will now automatically:\n🔍 Monitor all links for safety\n🎁 Send cute GIFs occasionally\n📈 Track user levels!')
            .addFields(
                { name: '✅ Safe Links', value: 'Will be marked as safe to click', inline: true },
                { name: '⚠️ Unsafe Links', value: 'Will be flagged with warnings', inline: true },
                { name: '🎀 Cute GIFs', value: 'Random cute moments!', inline: true },
                { name: '🌟 Level System', value: '50 messages = 1 level up\n30 voice minutes = 1 level up', inline: false }
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
