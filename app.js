const snoowrap = require('snoowrap');
const { createCanvas } = require('canvas')
const fs = require('fs');

const say = require("say");

require('dotenv').config();

function setupFileStructure(folderArray){
    for(let i = 0; i < folderArray.length; i += 1){
        if (!fs.existsSync(folderArray[i])){
            fs.mkdirSync(folderArray[i]);
        }
    }
}

async function getTopAskRedditThread (){
    try{

        const r = new snoowrap({
            userAgent: 'Windows:Video-Maker:1 (by /u/MisinformedEmu)',
            clientId:   process.env.REDDIT_CLIENTID,
            clientSecret: process.env.REDDIT_CLIENTSECRET,
            username: process.env.REDDIT_USERNAME,
            password: process.env.REDDIT_PASSWORD 
        });

        const subreddit = await r.getSubreddit('askReddit');
        const [topThread] = await subreddit.getTop({time: 'today', limit: 1});

        let data = [];

        const threadFolderPath = `./threads/${topThread.id}`;
        const commentFolderPath = `${threadFolderPath}/comments`;
        const audoFolderPath = `${commentFolderPath}/audio`;

        setupFileStructure([threadFolderPath, commentFolderPath, audoFolderPath]);

        const comments = await topThread.comments.fetchMore({amount: 10, skipReplies: true});

        // outputs subreddit json to text file
        fs.writeFileSync(`${threadFolderPath}/thread.txt`, JSON.stringify(topThread));

        const threadImageBuffer = createImage(topThread.title, topThread.author.name, topThread.ups);
        const threadImageFilePath = `${threadFolderPath}/title.png`;
        fs.writeFileSync(threadImageFilePath, threadImageBuffer);
        
        const titleAudioFilePath = `${threadFolderPath}/title.wav`;
        
        generateVoiceOver(topThread.title, titleAudioFilePath);
        let script = `[Title] [image: '${threadImageFilePath}'] [audio: '${titleAudioFilePath}'] ${topThread.title}`;

        const voicePromises = [];

        for(let i = 0; i < comments.length; i += 1){
            const imageFilePath = `${commentFolderPath}/${comments[i].id}.png`;
            const audioFilePath = `${audoFolderPath}/${comments[i].id}.wav`;
            let author = '[Deleted]'
            if(comments[i].author){
                author = comments[i].author.name;
            }
            const commentImageBufffer = createImage(comments[i].body, author, comments[i].score);
            fs.writeFileSync(imageFilePath, commentImageBufffer);
            
            const content = `User ${author} said, ${comments[i].body}`;
            script += '\n';
            script += `[Comment] [image: '${imageFilePath}'] [audio: '${audioFilePath}'] ${content}`;
            
            voicePromises.push(generateVoiceOver(content, audioFilePath));
        }


        await Promise.all(voicePromises).then(() => console.log('All Comments Generated'));

        
        fs.writeFileSync(`${threadFolderPath}/script.txt`, script);


    }catch(err){
        console.error(err);
    }  
};


function createImage(content, author, score){
    const width = 1200
    const height = 630

    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')

    context.fillStyle = '#000'
    context.fillRect(0, 0, width, height)

    context.font = 'bold 12pt Menlo'
    context.textAlign = 'center'
    context.textBaseline = 'top'
    context.fillStyle = '#3574d4'

    const text = content

    const textWidth = context.measureText(text).width
    context.fillRect(600 - textWidth / 2 - 10, 150 - 5, textWidth + 20, 120)

    context.fillStyle = '#fff'
    context.fillText(text, 600, 150)

    context.fillStyle = '#fff'
    context.font = 'bold 30pt Menlo'
    context.fillText(`${author}`, 600, 530)

    const buffer = canvas.toBuffer('image/png');

    return buffer;
}


function generateVoiceOver(text, filePath){
    return new Promise((resolve, reject) => {
        say.export(text, null, 1, filePath, (err) => {
            if (err) {
                console.error(err);
                reject(err);
            }

            console.log(`Text has been saved to ${filePath}`);
            resolve();
        });   
    })
   
}



function generateVideo(){}




getTopAskRedditThread();
