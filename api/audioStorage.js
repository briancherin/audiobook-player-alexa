var firebaseManager;
var firebaseObject;

function initialize(p_firebaseManager) {
	firebaseManager = p_firebaseManager;
	firebaseObject = firebaseManager.getFirebaseObject();
}

async function extractBookListFromFirebase() {
	const booksListRef = getBooksRef();
	
	var booksList = [];
	
	await booksListRef.once('value', function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			const bookKey = childSnapshot.key;
			const bookData = childSnapshot.val();
			
			const bookObject = {
				id: bookKey,
				...bookData
			};
			
			booksList.push(bookObject);
			
		});
	});
	
	return booksList;
	
}


async function getAudioStreamUrl(bookObject) {
	const uid = getCurrentUserId();
	const bookFileName = bookObject.id + "." + bookObject.fileExtension;
	const bookStorageRef = firebaseObject.storage().ref().child("books").child(uid).child(bookFileName);
	return await bookStorageRef.getDownloadURL();
}


// Gets book ref for current user
function getBooksRef() {
	const uid = getCurrentUserId();
	return firebaseObject.database().ref().child("booksData").child(uid);
}

// Updates timestamp and lastDeviceUsed
async function updateDatabaseTimestamp(bookKey, currTimestampMillis, deviceId) {
	return new Promise((resolve, reject) => {
		getBooksRef().child(bookKey).update({
			currentPositionMillis: currTimestampMillis,
			lastDeviceUsed: "alexa-" + deviceId
		}).then(() => {
			resolve();
		}).catch((error) => {
			reject(error);
		});
	});
	
	
}

async function getDatabaseTimestamp(bookKey) {
	return new Promise((resolve, reject) => {
		getBooksRef().child(bookKey).once('value', function(snapshot) {
			if (snapshot.length <= 0) {
				reject("No book found with that key.");
			} else {
				let timestamp = snapshot[0].val().currentPositionMillis;
				resolve(timestamp);
			}
		});
	});
	
}



function getCurrentUserId() {
	return firebaseManager.getCurrentUser().uid;
}

module.exports = {
	initialize,
	extractBookListFromFirebase,
	getAudioStreamUrl,
	updateDatabaseTimestamp,
	getDatabaseTimestamp
}