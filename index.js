
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const URL = require('url-parse');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Malicious domains and patterns to check
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

// Function to check if URL is safe
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

// Function to create safety embed
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
    console.log(`✅ ${client.user.tag} is online and monitoring links!`);
    console.log(`🔍 Monitoring ${client.guilds.cache.size} servers for link safety`);
    
    // Set bot status
    client.user.setActivity('🔍 Monitoring links for safety', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Extract URLs from the message
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
            .setTitle('🔍 Link Verification Bot Activated')
            .setColor(0x00FF00)
            .setDescription('I will now automatically monitor all messages in this server for link safety!')
            .addFields(
                { name: '✅ Safe Links', value: 'Will be marked as safe to click', inline: true },
                { name: '⚠️ Unsafe Links', value: 'Will be flagged with warnings', inline: true },
                { name: '🤖 Automatic', value: 'No commands needed - I work automatically!', inline: true }
            )
            .setFooter({ text: 'Your server is now protected against malicious links!' })
            .setTimestamp();
        
        guild.systemChannel.send({ embeds: [welcomeEmbed] }).catch(console.error);
    }
});

client.on('guildDelete', (guild) => {
    console.log(`❌ Left server: ${guild.name}`);
    console.log(`🔍 Now monitoring ${client.guilds.cache.size} servers total`);
});

// Error handling
client.on('error', console.error);

// Login with bot token
client.login(process.env.DISCORD_BOT_TOKEN);
