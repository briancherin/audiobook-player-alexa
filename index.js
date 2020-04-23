/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');

const audioStorage = require('./api/audioStorage');

const firebase = require('firebase');
require('firebase/auth');
require('firebase/database');
require('firebase/storage');

const firebase_config = require("./firebase_config");
 
firebase.initializeApp(firebase_config.firebaseConfig);


const LaunchHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
	  
    var speechOutput = GET_LAUNCH_MESSAGE;

    
    const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
    
    if (!accessToken) {
      speechOutput = "Please link your account with Alexa. Visit myaudiobookplayer.com to create your account, if you do not have one already.";
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME, speechOutput)
        .getResponse();
    }
      
    await firebase
      .auth()
      .signInWithCustomToken(accessToken)
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
        speechOutput = "I'm sorry, there was a problem connecting to your account. Please try again later.";
        
        return handlerInput.responseBuilder
          .speak(speechOutput)
          .withSimpleCard(SKILL_NAME, speechOutput)
          .getResponse();
        
      });
      
    const user = firebase.auth().currentUser;
    
    if (user) {
      //Login successful
      speechText = "Welcome to My Audiobook Player. What audiobook would you like to play? You can say 'help' for more options.";
      
      //Fetch the list of the user's audiobooks
      var bookList = await audioStorage.extractBookListFromFirebase(firebase);
      
      //For dyanmic slot types, the booklist must have 100 or less books
      bookList = bookList.slice(0, 100)

      helper.setBookList(handlerInput, bookList);

      //Create directive to add dynamic slot values for each book
      var replaceEntityDirective = {
        type: 'Dialog.UpdateDynamicEntities',
        updateBehavior: 'REPLACE',
        types: helper.getDynamicSlotTypesObject(bookList)
      };

      await firebase.auth().signOut();

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(speechOutput)
        .withSimpleCard(SKILL_NAME, GET_LAUNCH_MESSAGE)
        .addDirective(replaceEntityDirective)
        .getResponse();
    } 
    //USER ACCOUNT NOT LINKED:
    else {
      speechOutput = "Please link your account with Alexa. Visit myaudiobookplayer.com to create your account, if you do not have one already.";
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
    const message = helper.getBooksListMessage(bookTitles);
    const speechOutput = message;
    
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  }
};

const PlayBookIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'PlayBookIntent';
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    //TODO: Make sure the slot value is there.
    // const requestedBookKey = request.intent.slots.book.resolutions.resolutionsPerAuthority[0].values[0].value.id;
    const bookSlotValue = helper.getDynamicSlotValue(request.intent.slots.book);

    if (bookSlotValue) { //If the book the user requested is valid and is in their library

      const requestedBookKey = bookSlotValue.id;
      const requestedBookName = bookSlotValue.name;

       //TODO: Check if bookList() valid and if valid book found?
      const bookObject = helper.getBookList().filter(book => book.id === requestedBookKey);

      const bookUrl = helper.getBookAudioUrl(requestedBookKey);

      const audioDirective = {
        type: 'AudioPlayer.Play',
        playBehavior: 'REPLACE_ALL',
        audioItem: {
          stream: {
            url: bookUrl,
            token: "audiobook-" + requestedBookName,
            offsetInMilliseconds: bookObject.currentPositionMillis
          },
          metadata: {
            title: requestedBookName,
            subtitle: "", //TODO: Author?
            art: {
              sources: [
                {
                  url: "" //TODO: Cover?
                }
              ]
            }
          },
          backgroundImage: {
            sources: [
              {
                url: "" //TODO: Cover?
              }
            ]
          }
        }
      };

      const speechOutput = "Okay, playing " + requestedBookName + ".";

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .addDirective(audioDirective)
        .getResponse();
    } else {  //No valid book was requested
      const speechOutput = "I'm sorry, I couldn't find that book in your library. Please try again.";
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(speechOutput) //TODO: Put help message here
        .getResponse();
    }
  }
};

const PauseIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.PauseIntent';
  },
  handle(handlerInput) {
    
    //TODO: Implement
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

const ResumeIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.ResumeIntent';
  },
  handle(handlerInput) {
    //TODO: implement
    return handlerInput.responseBuilder
      .speak(msg)
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
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.NextIntent' ||
          request.intent.name === 'AMAZON.PreviousIntent');
  },
  handle(handlerInput) {
    const msg = "Sorry, I can't move forward or backwards through an audiobook yet."
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
    const msg = "Sorry, I can't shuffle an audiobook."
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
    const msg = "Sorry, I can't start an audiobook over yet."
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
    const msg = "Sorry, I can't repeat an audiobook."
    //TODO: Allow for this?
    return handlerInput.responseBuilder
      .speak(msg)
      .getResponse();
  }
};

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
const HELP_MESSAGE = 'You can say tell my what audiobooks I have, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';


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
	return handlerInput.attributesManager.getSessionAttributes().bookList;  
  },
  getBookTitles: function(handlerInput) {
	const bookList = this.getBookList(handlerInput);
	return bookList.map((book) => book.title);
  },
  getBookAudioUrl: async function(bookId) {
    const url = await audioStorage.getAudioStreamUrl(firebase, bookId);
    return url;
  },
  getDynamicSlotValue: function(slotObject) {
    //Ensure a value for the slot was found
    if (slotObject.resolutions && slotObject.resolutions.resolutionsPerAuthority) {
      slotObject.resolutions.resolutionsPerAuthority.forEach((authority => {
        //Only check to see if a dynamic slot entity was captured
        if (authority.authority.includes('amzn1.er-authority.echo-sdk.dynamic')) {
          if (authority.values && authority.values.length > 0) {  //Ensure there are values
            
            const value = authority.values[0];  //TODO: Could there be multiple values resolved? (i.e. index 0 might be incorrect)

            return {
              id: value.id,
              name: value.name
            };
          }
        }
      }));
    }

    //Return undefined if no valid dynamic slot value was found
    return undefined;
  },
  getDynamicSlotTypesObject: function(bookList) {
    return [
      {
        name: 'book',
        values: bookList.map(book => (
          {
            id: book.id,
            name: {
              value: book.title,
              synonyms: []
            }
          }
        ))
      }
    ];
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
    PauseIntent,
    ResumeIntent,
    LoopIntentHandler,
    TimeSkipIntentHandler,
    ShuffleIntentHandler,
    StartOverIntent,
    RepeatIntent,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda()(event, context, callback);
}
