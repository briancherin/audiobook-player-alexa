const firebaseManager = require('./firebaseManager');
const audioStorage = require('./audioStorage');

function initialize() {
    firebaseManager.initialize();
    audioStorage.initialize(firebaseManager);
}

function getFirebaseInstance() {
    return firebaseManager;
}

function getAudioStorageInstance() {
    return audioStorage;
}

module.exports = {
    initialize,
    getFirebaseInstance,
    getAudioStorageInstance
}