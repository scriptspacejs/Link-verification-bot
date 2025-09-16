const fs = require('fs');
const path = require('path');

// GitHub repository configuration
const GITHUB_USERNAME = 'scriptspacejs';
const GITHUB_REPO = 'Link-verification-bot';
const GITHUB_BRANCH = 'main';

// Local GIFs folder path
const GIFS_FOLDER = './gifs';

function listLocalGifs() {
    console.log('🎀 Local GIFs in ./gifs folder:');
    console.log('================================');

    try {
        const gifFiles = fs.readdirSync(GIFS_FOLDER).filter(file => 
            file.toLowerCase().endsWith('.gif') || 
            file.toLowerCase().endsWith('.png') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.jpeg')
        );

        if (gifFiles.length === 0) {
            console.log('❌ No GIF/image files found in ./gifs folder');
            return;
        }

        gifFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
            console.log(`   GitHub URL: https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/${GITHUB_BRANCH}/${file}`);
            console.log('');
        });

        console.log(`✅ Total files found: ${gifFiles.length}`);
        console.log('');
        console.log('📝 GitHub Repository Setup:');
        console.log('1. Your GIFs are uploaded directly to the repository root');
        console.log('2. Files are accessible at: /filename.gif');
        console.log('3. Your bot will automatically use these files from GitHub');

    } catch (error) {
        console.error('❌ Error reading gifs folder:', error.message);
        console.log('💡 Make sure the ./gifs folder exists and contains your GIF files');
    }
}

// Run the script
listLocalGifs();