import bluebird from 'bluebird'

class Rologic {
  constructor (matching) {
    this.matching = matching || [];
  }

  checkMatching (input) {
    const matches = [];
    return bluebird.resolve(this.matching).each(match => {
      return bluebird.resolve(match.commands).each(command => {
        let inputWords = this.splitPerWord(input);
        let commandWords = this.splitPerWord(command);

        const commandLength = commandWords.length;
        let matchingWords = 0;
        const params = {};

        inputWords.forEach(inputWord => {
          if (this.matchingWord(inputWord, commandWords)) {
            inputWords.splice(inputWords.indexOf(inputWord), 1);
            const index = commandWords.indexOf(inputWord);
            if (index > -1) {
              commandWords.splice(index, 1);
            }
            matchingWords++;
          }
        });

        commandWords.forEach(commandWord => {
          if (this.isParam(commandWord)) {
            inputWords.forEach(inputWord => {
              if (this.matchingParam(match.params, commandWord, inputWord)) {
                params[commandWord] = inputWord;
                matchingWords++;
              }
            });
          }
        });

        const score = (matchingWords / commandLength) * 100;
        if (matchingWords > 0 && score >= 60) {
          matches.push({
            'command': command,
            'match': match,
            'params': params,
            'score': score
          });
        }
      });
    }).then(() => this.sortMatching(matches));
  }

  isParam (input) {
    return (input && input.charAt(0) === '$');
  }

  matchingWord (inputWord, commandWords) {
    inputWord = String(inputWord).toLowerCase();
    commandWords = commandWords.map(commandWord => String(commandWord).toLowerCase());

    return (commandWords.indexOf(inputWord) > -1);
  }

  matchingParam (paramMatch, commandWord, inputWord) {
    const type = paramMatch[commandWord].type;
    const minLength = paramMatch[commandWord].minLength;
    const maxLength = paramMatch[commandWord].maxLength;

    if (!paramMatch[commandWord]) {
      return false;
    }

    if (type === typeof inputWord) {
      if (inputWord.length >= minLength) {
        if (inputWord.length <= maxLength) {
          return true;
        }
      }
    }

    return false;
  }

  sortMatching (matches) {
    matches.sort((a, b) => a.score < b.score);
    return bluebird.resolve(matches[0]);
  }

  splitPerWord (command) {
    return command.split(' ').filter(word => !!word);
  }

  cmd (input) {
    return this.checkMatching(input).then(match => {
      if (!match) {
        return bluebird.reject();
      }
      const response = {
        'fn': match.match.action,
        'params': match.params,
        'match': match
      };
      return bluebird.resolve(response);
    });
  }
}

module.exports = Rologic;