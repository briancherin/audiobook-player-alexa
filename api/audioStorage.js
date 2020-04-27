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
function updateDatabaseTimestamp(bookKey, currTimestampMillis, deviceId) {
	getBooksRef().child(bookKey).update({
		currentPositionMillis: currTimestampMillis,
		lastDeviceUsed: "alexa-" + deviceId
	});
}



function getCurrentUserId() {
	return firebaseManager.getCurrentUser().uid;
}

module.exports = {
	initialize,
	extractBookListFromFirebase,
	getAudioStreamUrl,
	updateDatabaseTimestamp
}