const snoowrap = require('snoowrap');
const { createCanvas } = require('canvas')
const fs = require('fs');
const dummyThread = require('./dummyData.json');
const say = require("say");

require('dotenv').config();

const r = new snoowrap({
    userAgent: 'Windows:Video-Maker:1 (by /u/MisinformedEmu)',
    clientId:   process.env.reddit_CLIENTID,
    clientSecret: process.env.reddit_CLIENTSECRET,
    username: process.env.reddit_USERNAME,
    password: process.env.reddit_PASSWORD
  });

function setupFileStructure(folderArray){
    for(let i = 0; i < folderArray.length; i += 1){
        if (!fs.existsSync(folderArray[i])){
            fs.mkdirSync(folderArray[i]);
        }
    }
}

async function getTopAskRedditThread (){
    try{
        const subreddit = await r.getSubreddit('askReddit');
        const [topThread] = await subreddit.getTop({time: 'today', limit: 1});
        // const topThread = dummyThread;
        // comments = topThread.comments;
        let data = [];

        const threadFolderPath = `./threads/${topThread.id}`;
        const commentFolderPath = `${threadFolderPath}/comments`;
        const audoFolderPath = `${commentFolderPath}/audio`;

        setupFileStructure([threadFolderPath, commentFolderPath, audoFolderPath]);


        const comments = (await r.getSubmission(subreddit.id).fetch({sort: 'top'})).comments;
        
        
        // outputs subreddit json to text file
        fs.writeFileSync(`${threadFolderPath}/thread.txt`, JSON.stringify(topThread));

        const threadImageBuffer = createImage(topThread.title, topThread.author, topThread.ups);
        const threadImageFilePath = `${threadFolderPath}/title.png`;
        fs.writeFileSync(threadImageFilePath, threadImageBuffer);
        
        const titleAudioFilePath = `${threadFolderPath}/title.wav`;
        
        generateVoiceOver(topThread.title, titleAudioFilePath);
        let script = `[Title] [image: '${threadImageFilePath}'] [audio: '${titleAudioFilePath}'] ${topThread.title}`;


        for(let i = 0; i < comments.length; i += 1){

            // didnt want to bother fixing the canvas so ima just set a max word count
            if(comments[i].body.split(' ').length <= 25){
                // data.push({
                //     id: comments[i].id,
                //     author: comments[i].author.name,
                //     content: comments[i].body,
                //     permalink:comments[i].permalink,
                //     score: comments[i].score // or .ups, seems to be the same value
                // });

                const imageFilePath = `${commentFolderPath}/${comments[i].id}.png`;
                const audioFilePath = `${audoFolderPath}/${comments[i].id}.wav`;
                
                const commentImageBufffer = createImage(comments[i].body, comments[i].author.name, comments[i].score);
                fs.writeFileSync(imageFilePath, commentImageBufffer);

                const content = `User ${comments[i].author.name} said, ${comments[i].body}`;
                script += '\n';
                script += `[Comment] [image: '${imageFilePath}'] [audio: '${audioFilePath}'] ${content}`;



                await generateVoiceOver(content, audioFilePath);
            }

       
        }

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
