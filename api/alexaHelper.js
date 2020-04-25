
function generatePlayDirective(bookObject) {
    return ({
        type: 'AudioPlayer.Play',
        playBehavior: 'REPLACE_ALL',
        audioItem: {
          stream: {
            url: bookUrl,
            token: "audiobook-" + bookObject.title,
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
      });
}

function generateStopDirective() {
    return({
        type: "AudioPlayer.Stop"
    });
}

module.exports = {
    generatePlayDirective,
    generateStopDirective
}