import Rologic from '../index'

const actions = {};

actions.sendMessage = (params) => {
  console.log('Send message to:', params.$name);
};

const matching = [
  {
    'commands': [
      'Send $name a message'
    ],
    'action': 'sendMessage',
    'params': {
      '$name': {
        'type': 'string',
        'minLength': 2,
        'maxLength': 20
      }
    }
  }
];

const rologic = new Rologic(matching);

rologic.cmd('send Jesse a message').then(res => {
  console.log('Match', res.match);
  actions[res.fn](res.params);
}).catch(() => {
  console.log('No matches found :(');
});