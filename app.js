const snoowrap = require('snoowrap');
const { createCanvas } = require('canvas')
const fs = require('fs');

require('dotenv').config();

const r = new snoowrap({
    userAgent: 'Video-maker',
    clientId:   process.env.reddit_CLIENTID,
    clientSecret: process.env.reddit_CLIENTSECRET,
    username: process.env.reddit_USERNAME,
    password: process.env.reddit_PASSWORD
  });


async function getTopAskRedditPost (){
    try{
        const subreddit = await r.getSubreddit('askReddit');

        console.log(subreddit);
        const [topPost] = await subreddit.getTop({time: 'today', limit: 1});
        
        let data = [];
        const comments = (await r.getSubmission(topPost.id).fetch({sort: 'top'})).comments;
        if (!fs.existsSync(`./images/${topPost.id}`)){
            fs.mkdirSync(`./images/${topPost.id}`);
        }   



        fs.writeFileSync(`./images/${topPost.id}/thread.txt`, JSON.stringify(topPost));

        const threadImageBuffer = createImage(topPost.title, topPost.author.name, topPost.ups);
        fs.writeFileSync(`./images/${topPost.id}/thread.png`, threadImageBuffer);
        
        for(let i = 0; i < comments.length; i += 1){

            // didnt want to bother fixing the canvas so ima just set a max word count
            if(comments[i].body.split(' ').length <= 25){
                data.push({
                    id: comments[i].id,
                    author: comments[i].author.name,
                    content: comments[i].body,
                    permalink:comments[i].permalink,
                    score: comments[i].score // or .ups, seems to be the same value
                });
    
                

                
                const commentImageBufffer = createImage(comments[i].body, comments[i].author.name, comments[i].score)
                fs.writeFileSync(`./images/${topPost.id}/comment_${comments[i].id}.png`, commentImageBufffer);

            }

       
        }


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

getTopAskRedditPost();