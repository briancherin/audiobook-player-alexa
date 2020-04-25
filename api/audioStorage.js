

async function extractBookListFromFirebase(firebaseObject) {
	const booksListRef = getBooksRef(firebaseObject);
	
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


async function getAudioStreamUrl(firebaseObject, bookKey) {
	const uid = getCurrentUserId(firebaseObject);
	const bookStorageRef = firebaseObject.storage().ref().child("books").child(uid).child(bookKey);
	return await bookStorageRef.getDownloadURL();
}

function getBooksRef(firebaseObject) {
	const uid = getCurrentUserId(firebaseObject);
	return firebaseObject.database().ref().child("booksData").child(uid);
}

// Updates timestamp and lastDeviceUsed
function updateDatabaseTimestamp(firebaseObject, bookKey, currTimestampMillis, deviceId) {
	getBooksRef(firebaseObject).child(bookKey).update({
		currentPositionMillis: currTimestampMillis,
		lastDeviceUsed: deviceId
	});
}



function getCurrentUserId(firebaseObject) {
	return firebaseObject.auth().currentUser.uid;
}

module.exports = {
	extractBookListFromFirebase,
	getAudioStreamUrl,
	updateDatabaseTimestamp
}