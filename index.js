/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');

const alexaHelper = require('./api/alexaHelper');

const factory = require('./api/factory');
factory.initialize();
const firebaseManager = factory.getFirebaseInstance();
const audioStorage = factory.getAudioStorageInstance();


const LaunchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
	  
    var speechOutput = GET_LAUNCH_MESSAGE;

    // Retrieve access token associated with the user, in order to log into 
    //firebase with this user's account
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    
    // If the user has not set up account linking with firebase yet, prompt the user to do so.
    if (!accessToken) {
      speechOutput = "Please link your account with Alexa. Visit myaudiobookplayer.com to create your account, if you do not have one already.";
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME, speechOutput)
        .getResponse();
    }

    //If the user has already set up account linking, use the access token to 
    //begin the firebase session with this user's account
    var user;
  
    await firebaseManager
      .signIn(accessToken)
      .catch(() => {
        speechOutput = "I'm sorry, there was a problem connecting to your account. Please try again later.";
        
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(SKILL_NAME, speechOutput)
          .getResponse();
      })
      .then(signed_in_user => {
        user = signed_in_user;
      });
      
    //Login successful:
    if (user) {
      speechText = "Welcome to My Audiobook Player. What audiobook would you like to play? You can say 'help' for more options.";
      
      //Fetch the list of the user's audiobooks
      var bookList = await audioStorage.extractBookListFromFirebase();
      
      //For dyanmic slot types, the booklist must have 100 or less books
      bookList = bookList.slice(0, 100)

      helper.setBookList(handlerInput, bookList);

      //Create directive to add dynamic slot values for each book
      var replaceEntityDirective = {
        type: 'Dialog.UpdateDynamicEntities',
        updateBehavior: 'REPLACE',
        types: alexaHelper.getDynamicSlotTypesObject(bookList)
      };

      //This is necessary to prevent Alexa from stalling. (This may not be true.)
      await firebaseManager.terminateSession();

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(speechOutput)
        .withSimpleCard(SKILL_NAME, GET_LAUNCH_MESSAGE)
        .addDirective(replaceEntityDirective)
        .getResponse();
    } 
    //USER ACCOUNT NOT LINKED: (or at least an error caused user to be undefined)
    else {
      speechOutput = "Sorry, something went wrong. Ensure that you have linked your account with Alexa. \
      Visit myaudiobookplayer.com to create your account, if you do not have one already.";
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME, speechOutput)
        .getResponse();
    }
  }
};

const ListBooksIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'ListBooksIntent';
  },
  handle(handlerInput) {
    const bookTitles = helper.getBookTitles(handlerInput);
    const speechOutput = helper.getBooksListMessage(bookTitles) + " Which audiobook would you like me to play?";

    repeat_message = speechOutput;  //Save the list in case the user asks to repeat
    
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt("Which audiobook would you like me to play? Say repeat to hear the list again.")
      .getResponse();
  }
};

const PlayBookIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'PlayBookIntent';
  },
  async handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    const bookSlotValue = helper.getDynamicSlotValue(request.intent.slots.book);

    if (bookSlotValue) { //If the book the user requested is valid and is in their library


      //TODO: Put this into a helper function? (Duplicated from LaunchHandler. Problem: How to deal with Alexa speech returns?)
      //Alternatively, deal with logging in (given access token) in firebaseManager? But that would disallow error alertion to user.

    //NEED TO RE-LOGIN TO FIREBASE.
    // Retrieve access token associated with the user, in order to log into 
    //firebase with this user's account
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    var user;
    await firebaseManager
      .signIn(accessToken)
      .catch(() => {
        speechOutput = "I'm sorry, there was a problem connecting to your account. Please try again later.";
        
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(SKILL_NAME, speechOutput)
          .getResponse();
      })
      .then(signed_in_user => {
        user = signed_in_user;
      });

      const requestedBookKey = bookSlotValue.id;

      //helper.setCurrentBookId(handlerInput, requestedBookKey);
      await helper.setPersistentCurrentBookId(handlerInput, requestedBookKey);

      const bookObject = helper.getBookList(handlerInput).filter(book => book.id === requestedBookKey)[0];

      //A valid book was found in the list of books:
      if (bookObject) {
        const bookUrl = await helper.getBookAudioUrl(bookObject);

        const audioDirective = alexaHelper.generatePlayDirective(bookObject, bookUrl);

        const speechOutput = "Okay, playing " + bookObject.title + ".";

        return handlerInput.responseBuilder
          .speak(speechOutput)
          .addDirective(audioDirective)
          .getResponse();
      }
      //The requested book was not found in the list of books
      else {
        console.error("ERROR: Requested audiobook was not found in the list of audiobooks.");
        const speechOutput = "I'm sorry, something went wrong. Please try again later.";
        const helpMessage = "You can tell me what audiobook to play, or ask me to list the audiobooks in your library."
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .reprompt(helpMessage)
          .getResponse();
      }   
    } 
    //No valid book was requested:
    else {  
      console.error("ERROR: The requested book (in slot value) was not found in the list of possible slot values. (i.e. not in the user's library.)")
      const speechOutput = "I'm sorry, I couldn't find that book in your library. Please try again.";
      const helpMessage = "You can tell me what audiobook to play, or ask me to list the audiobooks in your library."
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(helpMessage) 
        .getResponse();
    }
  }
};

const PauseIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.PauseIntent')
        || request.type === 'PlaybackController.PauseCommandIssued';
  },
  handle(handlerInput) {

    //Update the database timestamp with the current timestamp
//    await helper.updateDatabaseTimestamp(handlerInput, currentTimestamp, bookId);

    //Send AudioPlayer.Stop directive. This will also trigger the updating of 
    //the database timestamp (through the PlaybackStopped request)
    let stopDirective = alexaHelper.generateStopDirective();

    return handlerInput.responseBuilder
      .addDirective(stopDirective)
      .getResponse();
  }
};

const ResumeIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.ResumeIntent')
      || request.type === 'PlaybackController.PlayCommandIssued';
  },
  async handle(handlerInput) {

    //NEED TO RE-LOGIN TO FIREBASE. 
    //TODO: DO this somewhere else? Make better.
   
    // Retrieve access token associated with the user, in order to log into 
    //firebase with this user's account
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    var user;
    await firebaseManager
      .signIn(accessToken)
      .catch(() => {
        speechOutput = "I'm sorry, there was a problem connecting to your account. Please try again later.";
        
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(SKILL_NAME, speechOutput)
          .getResponse();
      })
      .then(signed_in_user => {
        user = signed_in_user;
      });
      //Re-fill the bookList (TODO: AGAIN, PUT THIS ALL IN A BIG CODE CHUNK SOMEWHERE ELSE)
      var bookList = await audioStorage.extractBookListFromFirebase();
      helper.setBookList(handlerInput, bookList);


      const currentBookKey = await helper.getPersistentCurrentBookId(handlerInput);
      const bookObject = helper.getBookList(handlerInput).filter(book => book.id === currentBookKey)[0];

      console.log("IN RESUME HANDLER: currentBookKey = " + currentBookKey);

      //Get current timestamp for this book, from database
      const currTimestampMillis = await helper.getDatabaseTimestamp(bookObject.id);
      
      //TODO: Ensure that bookObject is not undefined. (This has happened, maybe from bad book key?)
      bookObject.currentPositionMillis = currTimestampMillis;

      const bookUrl = await helper.getBookAudioUrl(bookObject);

      const audioDirective = alexaHelper.generatePlayDirective(bookObject, bookUrl);

      return handlerInput.responseBuilder
        .addDirective(audioDirective)
        .getResponse();

  }
};


const LoopIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.LoopOffIntent' || 
          request.intent.name === 'AMAZON.LoopOnIntent');
  },
  handle(handlerInput) {
    const msg = "Sorry, I can't loop an audiobook.";
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

const TimeSkipIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    //TODO: Split this up appropriately into skip forward / backward
    return (request.type === 'PlaybackController.NextCommandIssued'
      || request.type === 'PlaybackController.PreviousCommandIssued')
      || (request.type === 'IntentRequest'
        && (request.intent.name === 'AMAZON.NextIntent' ||
            request.intent.name === 'AMAZON.PreviousIntent'));
  },
  handle(handlerInput) {
    const msg = "Sorry, I can't move forward or backwards through an audiobook yet.";
    //TODO: Implement this.
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

const ShuffleIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.ShuffleOnIntent' || 
          request.intent.name === 'AMAZON.ShuffleOffIntent');
  },
  handle(handlerInput) {
    const msg = "Sorry, I can't shuffle an audiobook.";
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

const StartOverIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.StartOverIntent';
  },
  handle(handlerInput) {
    const msg = "Sorry, I can't start an audiobook over yet.";
    //TODO: Allow for this?
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

const RepeatIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.RepeatIntent';
  },
  handle(handlerInput) {
    //const msg = "Sorry, I can't repeat an audiobook.";
    //TODO: Change response depending on current state. E.g. could repeat menu options. (Or does alexa do this by default?)
    //(Either way, this handler currently would override ALL requests to repeat. So fix that.)
    const msg = repeat_message;
    return handlerInput.responseBuilder
      .speak(msg)
      .reprompt(msg)
      .getResponse();
  }
};

//When playback has been stopped, update the current timestamp position to the database.
//(Triggered whenever Stop directive is called.)
const PlaybackStoppedHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'AudioPlayer.PlaybackStopped';
  },
  async handle(handlerInput) {
    const currentTimestamp = handlerInput.requestEnvelope.request.offsetInMilliseconds;
    const bookId = handlerInput.requestEnvelope.request.token;
    await helper.updateDatabaseTimestamp(handlerInput, currentTimestamp, bookId);
    console.log("Triggered database update with timestamp " + currentTimestamp + " for audiobook ." + bookId);
  }
}

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    //Clear dynamic entities for this session
    const clearEntitiesDirective = {
      type: 'Dialog.UpdateDynamicEntities',
      updateBehavior: 'CLEAR'
    };

    return handlerInput.responseBuilder
      .addDirective(clearEntitiesDirective)
      .getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const msg = "Sorry, I don't know how to help with that. " + HELP_MESSAGE;

    return handlerInput.responseBuilder
      .speak(msg)
      .reprompt(HELP_MESSAGE)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

const SKILL_NAME = 'My Audiobook Player';
const GET_LAUNCH_MESSAGE = 'Welcome to My Audiobook Player!';
const HELP_MESSAGE = 'You can say, tell me what audiobooks I have, or, you can tell me to play a specific audiobook in your library, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

var repeat_message = "Sorry, I'm not sure what to repeat. Try saying the original command again, or say help to hear more options.";

const helper = {
  getBooksListMessage: function(bookTitles) {
    if (bookTitles === null){
      return "Sorry, I couldn't access your audiobook library right now. Try again later.";
    }
    const message = "The audiobooks in your library are: " + bookTitles.slice(0, bookTitles.length-1).join(", ") + ", and " + bookTitles[bookTitles.length-1] + ".";
    return message;
    
  },
  setBookList: function(handlerInput, bookList) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.bookList = bookList;
  },
  getBookList: function(handlerInput) {
    let list = handlerInput.attributesManager.getSessionAttributes().bookList;  
    if (list === undefined) list = [];
    return list;
  },
  getBookTitles: function(handlerInput) {
	  return this.getBookList(handlerInput).map((book) => book.title);
  },
  setCurrentBookId: function(handlerInput, bookId) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("Inside setCurrentBookId. getSessionAttributes():");
    console.log(handlerInput.attributesManager.getSessionAttributes());
    sessionAttributes.currentBookId = bookId;
  },
  getCurrentBookId: function(handlerInput) {
    console.log("Inside getCurrentBookId. getSessionAttributes():");
    console.log(handlerInput.attributesManager.getSessionAttributes());
    return handlerInput.attributesManager.getSessionAttributes().currentBookId;
  },
  getBookAudioUrl: async function(bookObject) {
    const url = await audioStorage.getAudioStreamUrl(bookObject);
    return url;
  },
  getDynamicSlotValue: function(slotObject) {
    
    let bookSlotObject = undefined;

    //Ensure a value for the slot was found
    if (slotObject.resolutions && slotObject.resolutions.resolutionsPerAuthority) {
      slotObject.resolutions.resolutionsPerAuthority.forEach((authority => {
        //Only check to see if a dynamic slot entity was captured
        //(And if bookSlotObject has already been set, do nothing. TODO: change this? (could there be multiple possible correct values?))
        if (bookSlotObject === undefined && authority.authority.includes('amzn1.er-authority.echo-sdk.dynamic')) {

          if (authority.values && authority.values.length > 0) {  //Ensure there are values
            const value = authority.values[0].value;  //TODO: Could there be multiple values resolved? (i.e. index 0 might be incorrect)

            //Object describing id and name of the requested audiobook:
            bookSlotObject = {
              id: value.id,
              name: value.name
            }

          }
        }
      }));
    }

    return bookSlotObject;
  },

  //Book ID needs to be presered across sessions so that Resume and time skips work
  setPersistentCurrentBookId: async function(handlerInput, bookId) {
    return new Promise((resolve, reject) => {
      handlerInput.attributesManager.getPersistentAttributes()
        .then((attributes) => {
          attributes.currentBookId = bookId;
          handlerInput.attributesManager.setPersistentAttributes(attributes); //Modify the cached object

          return handlerInput.attributesManager.savePersistentAttributes(); //Actually update the object to the database
        })
        .then(() => {
          resolve();
        })
        .catch((error) => {
          console.log("ERROR in setPersistentBookTimestamp: " + error);
          reject(error);
        })
    })
  },
  getPersistentCurrentBookId: async function(handlerInput) {
    return new Promise((resolve, reject) => {
      handlerInput.attributesManager.getPersistentAttributes()
        .then((attributes) => {
          resolve(attributes.currentBookId);
        })
        .catch((error) => {
          console.log("ERROR in getPersistentCurrentBookId: " + error);
          reject(error);
        });
    });
  },

  updateDatabaseTimestamp: async function(handlerInput, currTimestamp, bookId) {
    let deviceId = this.getDeviceId(handlerInput);

    return new Promise((resolve, reject) => {
      audioStorage.updateDatabaseTimestamp(bookId, currTimestamp, deviceId)
        .then(() => {
          resolve() //Success
        })
        .catch((error) => {
          console.log("Error in helper.updateDatabasetimestamp: " + error);
          reject(error);
        });
    });
 
  },
  getDatabaseTimestamp: async function(bookKey) {
    return new Promise((resolve, reject) => {
      audioStorage.getDatabaseTimestamp(bookKey)
        .then(timestamp => {
          resolve(timestamp);
        })
        .catch(error => {
          console.log("Error in helper.getDatabaseTimestamp: " + error);
          reject(error);
        });
    })
  },

  getDeviceId: function(handlerInput) {
    return handlerInput.requestEnvelope.context.System.device.deviceId;
  }

}


const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = (event, context, callback) => {
	
  context.callbackWaitsForEmptyEventLoop = false;

	
	return skillBuilder
  .addRequestHandlers(
    LaunchHandler,
    ListBooksIntentHandler,
    PlayBookIntentHandler,
    PauseIntentHandler,
    ResumeIntentHandler,
    LoopIntentHandler,
    TimeSkipIntentHandler,
    ShuffleIntentHandler,
    StartOverIntent,
    RepeatIntent,
    PlaybackStoppedHandler,
    HelpHandler,
    SessionEndedRequestHandler,
    FallbackIntentHandler,
    ExitHandler
  )
  .withPersistenceAdapter(alexaHelper.getPersistenceAdapter())
  .addErrorHandlers(ErrorHandler)
  .lambda()(event, context, callback);
}
