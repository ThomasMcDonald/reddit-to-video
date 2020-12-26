const Snoowrap = require('snoowrap');
const { createCanvas } = require('canvas');
const fs = require('fs');

const { exec } = require('child_process');
const say = require('say');

require('dotenv').config();

function setupFileStructure(folderArray) {
	for (let i = 0; i < folderArray.length; i += 1) {
		if (!fs.existsSync(folderArray[i])) {
			fs.mkdirSync(folderArray[i]);
		}
	}
}

function createImage(content, author, score) {
	const width = 1200;
	const height = 630;

	const canvas = createCanvas(width, height);
	const context = canvas.getContext('2d');

	context.fillStyle = '#000';
	context.fillRect(0, 0, width, height);

	context.font = 'bold 12pt Menlo';
	context.textAlign = 'center';
	context.textBaseline = 'top';
	context.fillStyle = '#3574d4';

	const text = content;

	const textWidth = context.measureText(text).width;
	context.fillRect(600 - textWidth / 2 - 10, 150 - 5, textWidth + 20, 120);

	context.fillStyle = '#fff';
	context.fillText(text, 600, 150);

	context.fillStyle = '#fff';
	context.font = 'bold 30pt Menlo';
	context.fillText(`${author}`, 600, 530);

	const buffer = canvas.toBuffer('image/png');

	return buffer;
}

function generateVoiceOver(text, filePath) {
	return new Promise((resolve, reject) => {
		say.export(text, null, 1, filePath, (err) => {
			if (err) {
				console.error(err);
				reject(err);
			}
			resolve();
		});
	});
}

async function generateVideo(threadFilePath) {
	const script = fs.readFileSync(`${threadFilePath}/script.txt`, 'utf8');

	// currently doesnt split title data

	const threadComments = script.split('[Comment]');

	const commentVideoPromises = [];
	let fileList = '';
	for (const [index, comment] of threadComments.entries()) {
		const [imagePath, audioPath] = comment.match(/'[^']*'(?=[^[']*('[^']*'[^'[]*)*\])/g);

		// disable max line otherwise the command refuses to run
		commentVideoPromises.push(
			// eslint-disable-next-line max-len
			exec(`ffmpeg -loop 1 -i ${imagePath.replace(/'/g, '')} -i ${audioPath.replace(/'/g, '')} -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -b:a 128k -shortest ${threadFilePath}/video/${index}.mp4`)
		);

		fileList += `file ${index}.mp4 \n`;
	}

	fs.writeFileSync(`${threadFilePath}/video/fileList.txt`, fileList);

	await Promise.all(commentVideoPromises);
	console.log('Comment videos created');

	const concatCommand = `ffmpeg -f concat -safe 0 -i ${threadFilePath}/video/fileList.txt -c copy ${threadFilePath}/final.mp4`;
	exec(concatCommand, (error, stderr) => {
		if (error || stderr) return console.error(error || stderr);
	});

	console.log('Final video created');
}

/**
 * @description Authenticate reddit user defined in env variables with Snoowrap
 * @returns {Snoowrap}
 */
function redditAuthentication() {
	const redditUser = new Snoowrap({
		userAgent: 'Windows:Video-Maker:1 (by /u/MisinformedEmu)',
		clientId: process.env.REDDIT_CLIENTID,
		clientSecret: process.env.REDDIT_CLIENTSECRET,
		username: process.env.REDDIT_USERNAME,
		password: process.env.REDDIT_PASSWORD
	});

	return redditUser;
}

async function getTopAskRedditThread() {
	try {
		const redditUser = redditAuthentication();

		const subreddit = await redditUser.getSubreddit('askReddit');
		const [topThread] = await subreddit.getTop({ time: 'today', limit: 1 });

		const threadFolderPath = `./threads/${topThread.id}`;
		const commentFolderPath = `${threadFolderPath}/comments`;
		const audioFolderPath = `${threadFolderPath}/audio`;
		const videoFolderPath = `${threadFolderPath}/video`;

		setupFileStructure([threadFolderPath, commentFolderPath, audioFolderPath, videoFolderPath]);

		console.log('Thread: "%s"', topThread.title);

		const comments = await topThread.comments.fetchMore({ amount: 10, skipReplies: true });

		// outputs subreddit json to text file
		fs.writeFileSync(`${threadFolderPath}/thread.txt`, JSON.stringify(topThread));

		const threadImageBuffer = createImage(topThread.title, topThread.author.name, topThread.ups);
		const threadImageFilePath = `${threadFolderPath}/title.png`;
		fs.writeFileSync(threadImageFilePath, threadImageBuffer);

		const titleAudioFilePath = `${threadFolderPath}/title.wav`;

		generateVoiceOver(topThread.title, titleAudioFilePath);
		let script = `[Title] [image: '${threadImageFilePath}'] [audio: '${titleAudioFilePath}'] ${topThread.title}`;

		const voicePromises = [];

		for (let i = 0; i < comments.length; i += 1) {
			const imageFilePath = `${commentFolderPath}/${i}.png`;
			const audioFilePath = `${audioFolderPath}/${i}.wav`;
			let author = '[Deleted]';
			if (comments[i].author) {
				author = comments[i].author.name;
			}
			const commentImageBufffer = createImage(comments[i].body, author, comments[i].score);
			fs.writeFileSync(imageFilePath, commentImageBufffer);

			const content = `User ${author} said, ${comments[i].body}`;
			script += '\n';
			script += `[Comment] [image: '${imageFilePath}'] [audio: '${audioFilePath}'] ${content}`;

			voicePromises.push(generateVoiceOver(content, audioFilePath));
		}

		await Promise.all(voicePromises);
		console.log('Comment iamges and audio created');

		fs.writeFileSync(`${threadFolderPath}/script.txt`, script);

		await generateVideo(threadFolderPath);
	} catch (err) {
		console.error(err);
	}
}

getTopAskRedditThread();
