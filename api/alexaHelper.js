const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const ddbTableName = "Alexa-audiobook-player-persistent-attributes-table";


function generatePlayDirective(bookObject, bookUrl) {
    return ({
        type: 'AudioPlayer.Play',
        playBehavior: 'REPLACE_ALL',
        audioItem: {
          stream: {
            url: bookUrl,
            token: bookObject.id, //Token cannot exceed 1024 characters
            offsetInMilliseconds: bookObject.currentPositionMillis
          },
          metadata: {
            title: bookObject.title,
            subtitle: "", //TODO: Author?
            art: {
              sources: [
                {
                  url: "" //TODO: Cover?
                }
              ]
            },
            backgroundImage: {
              sources: [
                {
                  url: "" //TODO: Cover?
                }
              ]
            }
          }
        }
      });
}

function generateStopDirective() {
    return({
        type: "AudioPlayer.Stop"
    });
}

//Object sent to ALexa to populate the dynamic slot type for book titles.
//Takes the book titles associated with this user's library
function getDynamicSlotTypesObject(bookList) {
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

function getPersistenceAdapter() {
  return new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: ddbTableName,
    createTable: true
  });
}

module.exports = {
    generatePlayDirective,
    generateStopDirective,
    getDynamicSlotTypesObject,
    getPersistenceAdapter
}