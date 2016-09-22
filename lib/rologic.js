import bluebird from 'bluebird'
import natural from 'natural'

class Rologic {
  constructor (matching) {
    this.matching = matching || [];
  }

  checkMatching (input) {
    const matches = [];
    return bluebird.resolve(this.matching).each(match => {
      return bluebird.resolve(match.commands).each(command => {
        let inputWords = this.splitPerWord(input);
        let inputWordsCopy = this.splitPerWord(input);
        let commandWords = this.splitPerWord(command);
        let commandWordsCopy = this.splitPerWord(command);
        const params = {};

        return this.checkMatchingWords(inputWords, inputWordsCopy, commandWords)
          .then(matchingWords => this.checkMatchingParams(inputWordsCopy, commandWords, params, match, matchingWords))
          .then(matchingWords => this.calculateScore(matchingWords, commandWordsCopy.length, matches, match, command, params));
      });
    }).then(() => this.sortMatching(matches));
  }

  calculateScore (matchingWords, commandLength, matches, match, command, params) {
    const score = (matchingWords / commandLength) * 100;
    if (matchingWords > 0 && score >= 60) {
      matches.push({ command, match, params, score });
    }
    return matches;
  }

  checkMatchingWords (inputWords, inputWordsCopy, commandWords) {
    let matchingWords = 0;
    return bluebird.resolve(inputWords).each(inputWord => {
      const matchingWord = this.matchingWord(inputWord, commandWords);
      if (matchingWord) {
        const inputIndex = inputWordsCopy.indexOf(inputWord);
        if (inputIndex > -1) {
          inputWordsCopy.splice(inputIndex, 1);
        }
        const commandIndex = commandWords.indexOf(matchingWord);
        if (commandIndex > -1) {
          commandWords.splice(commandIndex, 1);
        }
        matchingWords++;
      }
    }).then(() => matchingWords);
  }

  checkMatchingParams (inputWordsCopy, commandWords, params, match, matchingWords) {
    return bluebird.resolve(commandWords).each(commandWord => {
      if (this.isParam(commandWord)) {
        let matched = false;
        inputWordsCopy.forEach(inputWord => {
          if (!matched && this.matchingParam(match.params, commandWord, inputWord)) {
            params[commandWord] = inputWord;
            matched = true;
            matchingWords++;
          }
        });
      }
    }).then(() => matchingWords);
  }

  isParam (input) {
    return (input && input.charAt(0) === '$');
  }

  matchingWord (inputWord, commandWords) {
    let match = false;
    inputWord = String(inputWord).toLowerCase();
    const originalCommandWords = commandWords;
    commandWords = commandWords
      .map(commandWord => String(commandWord).toLowerCase())
      .forEach((commandWord, i) => {
        if (match) {
          return true;
        }
        if (!this.isParam(commandWord)) {
          const score = natural.JaroWinklerDistance(commandWord, inputWord);
          if (score > 0.85) {
            match = originalCommandWords[i];
          }
          return match;
        }
      });
    return match;
  }

  matchingParam (paramMatch, commandWord, inputWord) {
    const type = paramMatch[commandWord].type;
    const minLength = paramMatch[commandWord].minLength;
    const maxLength = paramMatch[commandWord].maxLength;

    if (!paramMatch[commandWord]) {
      return false;
    }

    const doesParamMatch = type === typeof inputWord
      && inputWord.length >= minLength
      && inputWord.length <= maxLength;

    if (doesParamMatch) {
      return true;
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