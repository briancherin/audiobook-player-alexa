const firebase = require('firebase');
require('firebase/auth');
require('firebase/database');
require('firebase/storage');

const firebase_config = require("../firebase_config");
 

function initialize() {
    firebase.initializeApp(firebase_config.firebaseConfig);
}

async function signIn(accessToken) {
    return new Promise((resolve, reject) => {
        firebase
        .auth()
        .signInWithCustomToken(accessToken)
        .catch(error => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("Error in signIn in firebaseManager.js. Error code: " + errorCode + ", message: " + errorMessage);
            reject(error);
        })
        .then(() => {
            resolve(getCurrentUser());
        })
    });
    
}

async function terminateSession() {
    await firebase.auth().signOut();
}

function getCurrentUser() {
    return firebase.auth().currentUser;
}

function getFirebaseObject() {
    return firebase;
}

module.exports = {
    initialize,
    signIn,
    getCurrentUser,
    terminateSession,
    getFirebaseObject
}